from google.appengine.api import app_identity
from google.appengine.ext import blobstore
from google.appengine.api.images import get_serving_url
from google.appengine.api.images import delete_serving_url
import webapp2

# https://cloud.google.com/appengine/docs/standard/python/images/#get-serving-url
class GetServingUrl(webapp2.RequestHandler):
    def get(self):
        # gs://kawal-c1.appspot.com/uploads/0juXBPWjfYMzBXNfVgTAScSwPYh2
        path = '/gs/{}'.format(self.request.get("path"))

        blob_key = blobstore.create_gs_key(path)

        # try:
        #     delete_serving_url(blob_key)
        # except:
        #     pass

        self.response.headers.add_header('Content-Type', 'text/plain')
        self.response.write(get_serving_url(blob_key))

app = webapp2.WSGIApplication([('/gsu', GetServingUrl)], debug=False)
