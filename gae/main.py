from google.appengine.ext import blobstore
from google.appengine.api import memcache
from google.appengine.api.images import get_serving_url
import webapp2

CACHE_TIMEOUT = 10

# https://cloud.google.com/appengine/docs/standard/python/images/#get-serving-url
class GetServingUrl(webapp2.RequestHandler):
    def get(self):
        # gs://kawal-c1.appspot.com/uploads/0juXBPWjfYMzBXNfVgTAScSwPYh2
        path = '/gs/{}'.format(self.request.get("path"))
        blob_key = blobstore.create_gs_key(path)
        self.response.headers.add_header('Content-Type', 'text/plain')
        self.response.write(get_serving_url(blob_key))

class GetChildrenApi(webapp2.RequestHandler):
    def get(self, path):
        self.response.headers['Content-Type'] = 'application/json'
        self.response.headers['Cache-Control'] = 'max-age=' + str(CACHE_TIMEOUT)
        self.response.headers['Access-Control-Allow-Origin'] = '*'

        # The children id parameter.
        cid = path[7:]

        # Loads from memcache if exists.
        json = memcache.get(cid)
        if json is not None:
            self.response.headers['X-Cache'] = 'HIT-M'
            return self.response.out.write(json)

        # TODO: Loads from Firestore and set it to memcache.
        self.response.headers['X-Cache'] = 'HIT-D'
        self.response.out.write('hit database')
        memcache.set(cid, '{"hello": "world"}', CACHE_TIMEOUT)

app = webapp2.WSGIApplication([
    ('/gsu', GetServingUrl),
    (r'/api/c/(\d+)', GetChildrenApi)
    ], debug=False)
