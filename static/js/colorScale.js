/**
 * colorScale.js
 * Creates a colorbar svg element
 * Requirements: an array of ints (labels), an array of colors codes, and div id
 * to attach svg element
 *
*/


function colorScale(bins, colors, divID) {
    var rectWidth = 25;
    var rectHeight = 20;
    var svgWidth = 110;
    var svgHeight = bins.length*(rectHeight+3) - 3;

    var ran = d3.range(bins.length);

    d3.select('#colorbarSvg').remove();

    var svg = d3.select(divID)
        .append('svg')
        .attr('id', 'colorbarSvg')
        .attr('width', svgWidth)
        .attr('height', svgHeight);

    var rects = svg.selectAll('.rects')
        .data(ran)
        .enter()
        .append('rect')
        .attr('y', (d,i)=>i*(rectHeight+3))
        .attr('height', rectHeight)
        .attr('x', 0)
        .attr('width', rectWidth)
        .attr('fill', function (d,i) {
            return colors[i];
        });

    var rectBox = [];

    svg.selectAll('rect').each(function(d, i) {
        rectBox[i] = this.getBBox();
    });

    rectBox.forEach(function(value, index) {
        svg.append('text')
        .attr('x', value.x + value.width + 5)
        .attr('y', value.y + 14)
        .style('font-size', 14)
        .style('font', 'bold')
        .text(function(d, i) { return bins[index][0] + " to " + bins[index][1]; });
     });
}
