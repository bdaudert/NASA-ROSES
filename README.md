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

    To create the "ee-python" conda environment, execute the following:
    ```
    conda remove --name ee-python --all
    conda create --name ee-python python=2.7
    ```

    To activate the "ee-python" environement on MacOS:
    ```
    source activate ee-python
    ```
    To activate the "ee-python" environment on Windows:
    ```
    activate ee-python
    ```

    To install the necessary external Python modules:
    ```
    conda install numpy=1.6.2=py27_4 oauth2client=2.2.0 httplib2 cryptography pyOpenSSL cffi
    pip install earthengine-api
    ```

    Create the requirements.txt file.
    At a minimum the requirements.txt file should look like this
    ```
    earthengine-api >= 0.1.100
    httplib2
    Jinja2 == 2.6
    numpy == 1.6.2
    oauth2client
    six
    ```
    The following command will install the the external Python modules listed in the requirements.txt file into the lib folder for upload to AppEngine.
    ```
    pip install -r requirements.txt -t lib
    ```
    
    You will need to tell app engine to add the lib folder to the third party libraries as follows:
    ```
    # appengine_config.py
    from google.appengine.ext import vendor

    # Add any libraries install in the "lib" folder.
    vendor.add('lib')
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

- Configuring App Engine to use the conda Environment:
    Install Google App Engine for Python and clone Earth Engine API repository.
    `~/Development/google_appengine/dev_appserver.py .`

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

#### GCloud

After initializing and activating the conda environment, the development server can be started from within the project folder.  The port only needs to be specificied if not using the default value of 8080.

```
dev_appserver.py --port 8080 app.yaml
```
To run in debugging mode:
```
dev_appserver.py --port 8080 --log_level=debug app.yaml
```
To run in debugging mode with nasa-roses-geojson as the default bucket:
```
dev_appserver.py --port 8080 --log_level=debug app.yaml --default_gcs_bucket_name nasa-roses-geojson
```

Sometimes windows needs the full path to dev_appserver.py:
```
python "c:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\dev_appserver.py" --port 8080 app.yaml
```

After installing GCloud, if you see this error message,
  File "/Users/katherine/google-cloud-sdk/platform/google_appengine/google/appengine/tools/devappserver2/metrics.py", line 117, in Stop
    total_run_time = int((Now() - self._start_time).total_seconds())
run this.. to fix metrics (recently added to Cloud SDK)

do this:
gcloud config set disable_usage_reporting true

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

