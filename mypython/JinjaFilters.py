#!/usr/bin/python
'''
Custom jinja template filters
{{var|function(args)}}
'''

def is_in(var, args):
    if args is None:
        return False
    if isinstance(args, basestring):
        arg_list = [str(arg).strip() for arg in args.split(',')]
    else:
        arg_list = [str(arg).strip() for arg in args]
    return str(var) in arg_list

def not_in(var, args):
    if args is None:
        return False
    if isinstance(args, basestring):
        arg_list = [str(arg).strip() for arg in args.split(',')]
    else:
        arg_list = [str(arg).strip() for arg in args]
    if str(var) in arg_list:
        return True
    return False

def make_string_range(start,end):
    try:
        rnge = range(int(start),int(end) + 1)
    except:
        rnge = range(9999,9999)
    rnge = [str(r) for r in rnge]
    return rnge

def make_int_range(start,end):
    try:
        rnge = range(int(start),int(end) + 1)
    except:
        rnge = range(9999,9999)
    return rnge

def divisibleby(number, divisor):
    if int(number) % int(divisor) == 0:
        return True
    return False
