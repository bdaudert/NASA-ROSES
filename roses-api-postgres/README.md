# NASA-ROSES API

## What's included in the directory:<br/>
  index.js - entry point for the server<br/>
  queries.js - contains functions for API<br/>
  package.json - contains npm metadata<br/>
  (located on /home/shared/roses-api-postgres/)
  
  node.service - systemd service file, runs API as service
  (located at /etc/systemd/system/
  
The roses server has node and express installed. Also, in the API directory there is an additional folder, node_modules, that contains nodejs files that interface with PostgreSQL database (this is the third party module, pg, used in queries.js). These are not under source control, but currently installed at /home/shared/roses-api-postgres/. To run the program in another directory these need to be installed with the command, npm i express pg.

## Commands for running the service:<br/> 
  sudo systemctl start node.service<br/>
  sudo systemctl stop node.service<br/>
  If making changes to the node.service file, you must first run sudo systemctl daemon-reload before starting the service.  
  
## Commands for running the API manually (ideal during development):<br/>
  node index.js (in /home/shared/roses-api-postgres/) 
  
## Checking output:<br/>
  GET -output can be seen on the browser using roses.dri.edu:<port number>/<route name>
  OR curl roses.dri.edu:<port number>/<route name> (outside of DRI)
  curl localhost.edu:<port number>/<route name> (on the roses server)
  
  POST - curl --data <data> <url>:<port number>/<route name>. 
  Ex. curl --data "min=50&max=75" http://localhost:8080/etdatarange
  
  Javascript AJAX call -  
  Ex.  
  jqXHR = $.ajax({   
        url: "roses.dri.edu:8080/etdatarange,  
        method: "POST",  
        timeout: 60 * 5 * 1000,  
        data: "{ min: 50, max: 75 }",  
    }). 
  
  
  



