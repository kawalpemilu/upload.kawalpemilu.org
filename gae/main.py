from google.appengine.ext import blobstore
from google.appengine.api import memcache
from google.appengine.api import urlfetch
from google.appengine.api.images import get_serving_url
import webapp2
import logging
import json

# https://cloud.google.com/appengine/docs/standard/python/images/#get-serving-url
class GetServingUrl(webapp2.RequestHandler):
    def get(self):
        # gs://kawal-c1.appspot.com/uploads/0juXBPWjfYMzBXNfVgTAScSwPYh2
        path = '/gs/{}'.format(self.request.get("path"))
        blob_key = blobstore.create_gs_key(path)
        self.response.headers.add_header('Content-Type', 'text/plain')
        self.response.write(get_serving_url(blob_key))

class GetChildrenApi(webapp2.RequestHandler):
    def get(self, cid):
        self.response.headers['Content-Type'] = 'application/json'
        self.response.headers['Cache-Control'] = 'max-age=3600'
        self.response.headers['Access-Control-Allow-Origin'] = '*'

        # Loads from memcache if exists.
        jsonTxt = memcache.get(cid)
        if jsonTxt is not None:
            h = json.loads(jsonTxt)
            if 'depth' in h and 'data' in h and len(h['data'].keys()) > 0:
                self.response.headers['X-Cache'] = 'HIT-M'
                return self.response.out.write(jsonTxt)

        try:
            # Fetch fresh from the real API and set it to memcache.
            url = 'https://kawal-c1.firebaseapp.com/api/c/' + cid + '?abracadabra=1'
            jsonTxt = urlfetch.fetch(url).content
            self.response.headers['X-Cache'] = 'HIT-D'
            self.response.out.write(jsonTxt)

            h = json.loads(jsonTxt)
            if 'depth' in h:
                memcache.set(cid, jsonTxt)
        except urlfetch.Error:
            self.response.out.write('{}')
            memcache.set(cid, '{}', 3600)
            logging.exception('Failed fetching ' + url)

app = webapp2.WSGIApplication([
    ('/gsu', GetServingUrl),
    (r'/api/c/(-?\d+)', GetChildrenApi)
    ], debug=False)
