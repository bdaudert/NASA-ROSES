/*
Utility functions:
*/
Array.prototype.indexOf = function(obj, start) {
     for (var i = (start || 0), j = this.length; i < j; i++) {
         if (this[i] === obj) { return i; }
     }
     return -1;
}

String.prototype.is_in = function(list){
    return ( list.indexOf(this.toString()) != -1)
}

String.prototype.not_in = function(list){
    return ( list.indexOf(this.toString()) == -1)
}

Array.prototype.remove = function(val, all) {
    var i, new_array = this;
    if (all) {
        for(i = this.length; i--;){
            if (this[i][1] === val) new_array.splice(i, 1);
        }
    }
    else {  //same as before...
        i = this.indexOf(val);
        if(i>-1) new_array.splice(i, 1);
    }
    return new_array;
};

Array.prototype.replace = function(val,new_val, all) {
    var i, new_array = this;
    if (all) {
        for(i = this.length; i--;){
            if (this[i][1] === val) {
                new_array[i] = new_val;
            }
        }
    }
    else {  //same as before...
        i = this.indexOf(val);
        if(i>-1) new_array[i] = new_val;
    }
    return new_array;
};