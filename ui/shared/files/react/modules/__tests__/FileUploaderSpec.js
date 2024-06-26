/*
 * Copyright (C) 2014 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import FileUploader from '../FileUploader'
import moxios from 'moxios'

function setupMocks() {
  moxios.stubRequest('/api/v1/folders/1/files', {
    status: 200,
    response: {
      file_param: 'file',
      upload_url: '/upload/url',
      upload_params: {
        Filename: 'foo',
        success_action_status: '201',
        'content-type': 'text/plain',
        success_url: '/create_success',
      },
    },
  })
  moxios.stubRequest('/upload/url', {
    status: 201,
    response: {},
  })
  moxios.stubRequest('/create_success', {
    status: 200,
    response: {
      id: '17',
      'content-type': 'text/plain',
    },
  })
}

const folder = {
  id: 1,
  folders: {
    fetch: () => Promise.resolve(),
  },
  files: {
    fetch: () => Promise.resolve(),
  },
}

const mockFileOptions = function () {
  return {
    file: new File(['hello world'], 'foo', {type: 'text/plain'}),
  }
}

QUnit.module('FileUploader', {
  setup() {
    moxios.install()
    setupMocks()
  },
  teardown() {
    moxios.uninstall()
  },
})

test('posts to the files endpoint to kick off upload', function (assert) {
  const done = assert.async()
  const fuploader = new FileUploader(mockFileOptions(), folder)
  sinon.stub(fuploader, 'onPreflightComplete')

  moxios.wait(() => {
    return fuploader.upload().then(_response => {
      equal(moxios.requests.mostRecent().url, '/api/v1/folders/1/files')
      done()
    })
  })
})

test('stores params from preflight for actual upload', function (assert) {
  const done = assert.async()
  const fuploader = new FileUploader(mockFileOptions(), folder)
  sinon.stub(fuploader, '_actualUpload')

  moxios.wait(() => {
    return fuploader.upload().then(_response => {
      equal(fuploader.uploadData.upload_url, '/upload/url')
      equal(fuploader.uploadData.upload_params.Filename, 'foo')
      done()
    })
  })
})

test('completes upload after preflight', function (assert) {
  const done = assert.async()
  const fuploader = new FileUploader(mockFileOptions(), folder)

  sandbox.stub(fuploader, 'addFileToCollection')

  moxios.wait(() => {
    return fuploader.upload().then(_response => {
      ok(
        fuploader.addFileToCollection.calledWith({id: '17', 'content-type': 'text/plain'}),
        'got metadata from success_url'
      )
      done()
    })
  })
})

test('roundProgress returns back rounded values', function () {
  const fuploader = new FileUploader(mockFileOptions(), folder)
  sandbox.stub(fuploader, 'getProgress').returns(0.18) // progress is [0 .. 1]
  equal(fuploader.roundProgress(), 18)
})

test('roundProgress returns back values no greater than 100', function () {
  const fuploader = new FileUploader(mockFileOptions(), folder)
  sandbox.stub(fuploader, 'getProgress').returns(1.1) // something greater than 100%
  equal(fuploader.roundProgress(), 100)
})

test('getFileName returns back the option name if one exists', function () {
  const options = mockFileOptions()
  options.name = 'use this one'
  const fuploader = new FileUploader(options, folder)
  equal(fuploader.getFileName(), 'use this one')
})

test('getFileName returns back the actual file if no optinal name is given', function () {
  const options = mockFileOptions()
  const fuploader = new FileUploader(options, folder)
  equal(fuploader.getFileName(), 'foo')
})
