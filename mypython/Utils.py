#!/usr/bin/env python

#############
# GEOMETRTY
#############


def orient_bbox(polygon_array):
    lons = sorted([polygon_array[0][0], polygon_array[1][0]])
    lats = sorted([polygon_array[0][1], polygon_array[1][1]])
    return [lons[0], lats[0], lons[1], lats[1]]


def orient_poly_ccw(polygon_array):
    sum1 = 0
    sum2 = 0
    for i in range(len(polygon_array[0:len(polygon_array) - 1])):
        sum1 += polygon_array[i][0] * polygon_array[i + 1][1]
        sum2 += polygon_array[i + 1][0] * polygon_array[i][1]
    sum1 += polygon_array[len(polygon_array) - 1][0] * polygon_array[0][1]
    sum2 += polygon_array[0][0] * polygon_array[len(polygon_array) - 1][1]
    A = sum1 - sum2
    # Already ccw
    if A > 0:
        return polygon_array
    # cw, need to reverse the coords
    if A < 0:
        return list(reversed(polygon_array))
    if A == 0:
        return polygon_array
