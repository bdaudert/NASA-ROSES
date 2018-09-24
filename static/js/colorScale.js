/**
 * colorScale.js
 * Creates a colorbar svg element
 * Requirements: an array of ints (labels), an array of colors codes, and div id
 * to attach svg element
 *
*/


function colorScale(dom, ran, divID) {
    var rectHeight = 20;
    var rectWidth = 35;
    var svgHeight = 40;
    var svgWidth = dom.length*(rectWidth+3) - 3;

    var colors = d3.scaleLinear()
       .domain(dom)
       .range(ran);

    d3.select('#colorbarSvg').remove();

    var svg = d3.select(divID)
        .append('svg')
        .attr('id', 'colorbarSvg')
        .attr('width', svgWidth)
        .attr('height', svgHeight);

    var rects = svg.selectAll('.rects')
        .data(dom)
        .enter()
        .append('rect')
        .attr('y', 0)
        .attr('height', rectHeight)
        .attr('x', (d,i)=>i*38)
        .attr('width', rectWidth)
        .attr('fill', d=>colors(d));

    var rectBox = [];

    svg.selectAll('rect').each(function(d, i) {
        rectBox[i] = this.getBBox();
    });


    rectBox.forEach(function(value, index) {
        svg.append('text')
        .attr('x', value.x + value.width/2)
        .attr('y', value.y + value.height+14)
        .attr('text-anchor', 'middle')
        .style('font-size', 12)
        .style('font', 'bold')
        .text(function(d, i) { return dom[index]; });
     });
}
