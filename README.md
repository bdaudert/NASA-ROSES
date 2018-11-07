# NASA ROSES

Code repository for the NASA ROSES prototype web interface and tool under development by the Desert Research Institute, NASA for NOAA
### Links & Resources

You can find the most up-to-date deployments [here](http://nasa-roses.appspot.com/).

- [Earth Engine Documentation](https://sites.google.com/site/earthengineapidocs/)
- [Earth Engine Access Library](https://code.google.com/p/earthengine-api/wiki/Installation)
- [Earth Engine Playground](https://code.earthengine.google.com/)
- [Google Cloud Platform](https://cloud.google.com/appengine/docs/python/gettingstartedpython27/helloworld)
- [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)
- [Google Maps Javascript API v3](https://developers.google.com/maps/documentation/javascript/)

### Installing & Running Google Earth Engine Python API
- Links:
    - https://docs.google.com/document/d/1tvkSGb-49YlSqW3AGknr7T_xoRB1KngCD3f2uiwOS3Q/edit
- Installation

    The preferred tooling for managing your App Engine applications in Python is Google Cloud SDK. Install it. 
    - https://cloud.google.com/sdk/docs/

    To create the "nasa-roses" conda environment, execute the following:
    ```
    conda remove --name nasa-roses --all
    conda create --name nasa-roses python=3.7
    ```

    To activate the "nasa-roses" environement on MacOS:
    ```
    source activate nasa-roses
    ```
    To activate the "nasa-roses" environment on Windows:
    ```
    activate nasa-roses
    ```

    To install the necessary external Python modules:
    ```
    conda install -c anaconda numpy cryptography pyOpenSSL cffi sqlalchemy psycopg2 gunicorn
    
    conda install -c anaconda jinja2 flask
    
    conda install -c conda-forge earthengine-api shapely geoalchemy2 psycopg2 oauth2client httplib2 geojson
    
    pip install --upgrade google-cloud-datastore
    ```

    Create the requirements.txt file.
    At a minimum the requirements.txt file should look like this
    ```
    earthengine-api >= 0.1.100
    httplib2
    jinja2
    flask
    oauth2client
    six
    sqlalchemy
    geoalchemy2
    shapely
    geojson
    gunicorn
    psycopg2
    ```
    
    The following command will install the the external Python modules listed in the requirements.txt file into the lib folder for upload to AppEngine.
    ```
    pip install -r requirements.txt -t lib
    ```
     
    In config.py set your google account settings
    ```
    # The service account email address authorized by your Google contact.
    # Set up a service account as described in the README.
    EE_ACCOUNT = 'x@<projectID>.iam.gserviceaccount.com'
    # The private key associated with your service account in JSON format.
    EE_PRIVATE_KEY_FILE = 'privatekey.json'
    EE_CREDENTIALS = ee.ServiceAccountCredentials(EE_ACCOUNT, EE_PRIVATE_KEY_FILE)
    ```

- Testing installation and authentication:

    `python -c "import ee; print ee.__version__"`

    `python -c "import os; import ee; EE_ACCOUNT = os.environ.get('EE_ACCOUNT'); EE_PRIVATE_KEY_FILE = os.environ.get('EE_PRIVATE_KEY_FILE'); ee.Initialize(ee.ServiceAccountCredentials(EE_ACCOUNT, EE_PRIVATE_KEY_FILE)); print(ee.Image('srtm90_v4').getThumbUrl())"`


### Local Development Server

The dev_appserver.py tool is being deprecated in the Python 3.7 standard environment (see: https://cloud.google.com/appengine/docs/standard/python3/testing-and-deploying-your-app).

Instead, a local WGSI development server can be started from within the project folder using either waitress (windows) or gunicorn (mac/linux).  After starting the server (and assuming a port of 8080), the page can be viewed at the URL [http://localhost:8080/](http://localhost:8080/).

#### Windows

Install the waitress python module (if needed):
```
pip install waitress
```

Start the local server:
```
waitress-serve --listen=*:8080 main:app
```

#### Linux/Mac

Install the gunicorn python module (if needed):
```
pip install gunicorn
```

Set the application credentials and start the local server:
```
export GOOGLE_APPLICATION_CREDENTIALS=<file path of the JSON file that contains your service account key>
gunicorn -b :8080 main:app --reload
```

#### GCloud


The app can be then be deployed from within the project folder (the project and version flags may not be necessary).
```
gcloud app deploy --project nasa-roses --version 1
```

To update the cron or queue information, these must be explicitly listed in the DEPLOYABLES section of the gcloud call (see: https://cloud.google.com/sdk/gcloud/reference/app/deploy).

```
gcloud app deploy app.yaml cron.yaml --project nasa-roses --version 1
```

To update GCloud:
```
gcloud components update
```

### Repository Organization:
- app.yaml (configuration file for webapp2 templating)
- main.py (python script that sets up the framework environment and defines classes for handling URL requests)
- myphyton (custom python scripts)
- statics
    statics.py (predefined static objects)
    - css
    - myjs (custom, project specific specific javascript files)
    - js (general javascript files downloaded from the internet)
    - json (json files)
- media
    -img (Images)
- templates
    - nasa-roses.html (index html, main html file for nasa-roses project)
    - all other html files

