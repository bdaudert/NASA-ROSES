# Open-ET-1

Code repository for the Open-ET prototype web interface and tool under development by the Desert Research Institute, NASA, Environmental Defense Fund (EDF) and Google.

### Links & Resources

You can find the most up-to-date deployments [here](http://open-et-1.appspot.com/).

- [Earth Engine Documentation](https://sites.google.com/site/earthengineapidocs/)
- [Earth Engine Access Library](https://code.google.com/p/earthengine-api/wiki/Installation)
- [Earth Engine Playground](https://code.earthengine.google.com/)
- [Google Cloud Platform](https://cloud.google.com/appengine/docs/python/gettingstartedpython27/helloworld)
- [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)
- [Google Maps Javascript API v3](https://developers.google.com/maps/documentation/javascript/)

### General Git Instructions:
- Working with the centralized repo:
    - `git clone https://github.com/bdaudert/Open-ET-1 directory_name`
    - `git remote rename original-name new-name`
    - Make symbolic links to Anaconda environment packages:
         - `pip install -r requirements.txt -t lib`
        - `ln -s $HOME/anaconda/envs/ee-python/lib/python2.7/site-packages/ee ee`
        - `ln -s $HOME/anaconda/envs/ee-python/lib/python2.7/site-packages/oauth2client/ oauth2client`
        - `ln -s $HOME/anaconda/envs/ee-python/lib/python2.7/site-packages/six.py six.py`
        - `ln -s $HOME/anaconda/envs/ee-python/lib/python2.7/site-packages/httplib2 httplib2`
    - Make symbolic link to private key:
        - `ln -s ~/.keys/privatekey.pem`
    - Set Developer information:
        - `app-id` in app.yaml
        - `x@developer.gserviceaccount.com` in config.py
    - `git branch` to look at branches.
    - `git branch -b branch-name` to create and switch to new local branch for working on feature.
    - `git add` to stage files and `git commit` to commit to feature branch.
    - `git checkout development` to switch back to development branch.
    - `git merge branch-name` to merge `branch-name` into the current branch.
    - `git push remote-name development`


### Installing & Running Google Earth Engine Python API
- Links:
    - https://docs.google.com/document/d/1tvkSGb-49YlSqW3AGknr7T_xoRB1KngCD3f2uiwOS3Q/edit
- Installation:
    - Download Anaconda with Python 2.7 and install.
    - To remove environment: `conda remove -n myenv --all` where `myenv` is environment name.
    - To create environment: `conda create -n ee-python python=2.7`
    - Activate environment: `source activate ee-python`
    - Install packages:
        - `conda install pycrypto`
        - `conda install pip`
        - `conda install numpy`
        - `pip install oauth2client`
        - `pip install --no-deps earthengine-api`
    - To test installation and authentication:
        - `python -c "import ee; print ee.__version__"`
        - `python -c "import os; import ee; MY_SERVICE_ACCOUNT = os.environ.get('MY_SERVICE_ACCOUNT'); MY_PRIVATE_KEY_FILE = os.environ.get('MY_PRIVATE_KEY_FILE'); ee.Initialize(ee.ServiceAccountCredentials(MY_SERVICE_ACCOUNT, MY_PRIVATE_KEY_FILE)); print(ee.Image('srtm90_v4').getThumbUrl())"`
- Configuring App Engine to use conda Environment:
    - Install Google App Engine for Python and clone Earth Engine API repository.
    - `~/Development/google_appengine/dev_appserver.py .


### Repository Organization:
- open-et-1.html (index html, main html file for open-et-1 project)
- app.yaml (configuration file for webapp2 templating)
- main.py (python script that sets up the framework environment and defines classes for handling URL requests)
- myphyton (custom python scripts)
- statics
    statics.py (predefined static objects)
    - css
    - myjs (custom, open-et-1 specific javascript files)
    - js (general javascript files downloaded from the internet)
    - json (json files)
- media
    -img (Images)
- templates
    - all html files

#### Conda Environment
To create the "ee-python" conda environment, execute the following:
```
conda remove --name ee-python --all
conda create --name ee-python python=2
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
conda install numpy=1.6.2=py27_4 oauth2client httplib2 cryptography pyOpenSSL cffi
pip install earthengine-api
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

#### GCloud

After initializing and activating the conda environment, the development server can be started from within the project folder.  The port only needs to be specificied if not using the default value of 8080.

```
dev_appserver.py --port 8080 app.yaml
```
To run in debugging mode:
```
dev_appserver.py --port 8080 --log_level=debug app.yaml
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
gcloud app deploy --project open-et-1 --version 1
```

To update the cron or queue information, these must be explicitly listed in the DEPLOYABLES section of the gcloud call (see: https://cloud.google.com/sdk/gcloud/reference/app/deploy).

```
gcloud app deploy app.yaml cron.yaml --project open-et-1 --version 1
```

To update GCloud:
```
gcloud components update
```

