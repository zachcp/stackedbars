var dbg, dbg2, dbg3, dbgs, dbgy, dbgx, dbgwd, dbgwdprocesses, colrrng;

HTMLWidgets.widget({

  name: 'stackedbar',

  type: 'output',

  initialize: function(el, width, height) {
    return { };
  },

  renderValue: function(el, params, instance) {
    instance.params = params;
    this.drawGraphic(el, params, el.offsetWidth, el.offsetHeight);
  },

  drawGraphic: function(el, params, width, height) {

    // remove existing children
    while (el.firstChild)
    el.removeChild(el.firstChild);

    //var format = d3.time.format("%Y-%m-%d");
    dbg = params ;

    // reformat the data to wide
    var data = HTMLWidgets.dataframeToD3(params.data) ;

    data.forEach(function(d) {
      d.colname = d.colname;
      d.value = +d.value;
    });

    // convert to wide format
    // HT http://jonathansoma.com/tutorials/d3/wide-vs-long-data/
    var widedata = d3.nest()
      .key(function(d) { return d["rowname"] }) // sort by key
      .rollup(function(d) { // do this to each grouping
      // reduce takes a list and returns one value
      // in this case, the list is all the grouped elements
      // and the final value is an object with keys
      return d.reduce(function(prev, curr) {
        prev["rowname"] = curr["rowname"];
        prev[curr["colname"]] = curr["value"];
        return prev;
        }, {});
      })
      .entries(data) // tell it what data to process
      .map(function(d) { // pull out only the values
        return d.values;
    });

    dbg2 = data;
    dbgwd = widedata;
    
    // assign colors

    var colorrange = [];
    var tooltip ;
    var opacity = 0.33 ;

var ncols = d3.keys(dbgwd[0]).length;
    if (ncols <= 2) { ncols = 3 ; }

    if (params.fill == "brewer") {
      if (ncols > 9) ncols = 9;
      colorrange = colorbrewer[params.palette][ncols];
      console.log(colorrange);
    } else if (params.fill == "manual") {
      colorrange = params.palette;
    }
    strokecolor = colorrange[0];

    // setup size, scales and axes
    var margin = { top: params.top, right: params.right,
                   bottom: params.bottom, left: params.left };
    width = width - margin.left - margin.right;
    height = height - margin.top - margin.bottom;

    var x = d3.scale.ordinal().rangeRoundBands([0, width], .1);
    var y = d3.scale.linear().rangeRound([height, 0]);

    // color 
    var colorkeys = d3.keys(dbgwd[0]).filter(function(key) { return key !== "rowname"; })
    var colors    =  d3.scale.ordinal()
                      .range(colorrange)
                      .domain(colorkeys);
    
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .tickFormat(d3.format(".2s"));

    var svg = d3.select("#" + el.id).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    dbgs = svg;

    // Sum and Sort the Data
    widedata.forEach(function(d) {
      var y0 = 0;
      d.ages = colorkeys.map(function(name) { 
        return {name: name, y0: y0, y1: y0 += +d[name]}; });
      console.log(d.ages);
      d.total = d.ages[d.ages.length - 1].y1;
    });
    
    if (params.xsort) {
        widedata.sort(function(a, b) { return b.total - a.total; });
    }
    
    x.domain(widedata.map(function(d) { return d['rowname']; }));
    y.domain([0, d3.max(widedata, function(d) { return d.total; })]);
    
    colrrng = colorkeys;
    
    // all the drawing is here
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);
  
    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(params.ytitle);

    
    var state = svg.selectAll(".state")
        .data(widedata)
      .enter().append("g")
        .attr("class", "g")
        .attr("transform", function(d) { return "translate(" + x(d.rowname) + ",0)"; });
  
    state.selectAll("rect")
        .data(function(d) { return d.ages; })
      .enter().append("rect")
        .attr("width", x.rangeBand())
        .attr("y", function(d) { return y(d.y1); })
        .attr("height", function(d) { return y(d.y0) - y(d.y1); })
        .style("fill", function(d) { return colors(d.name); });
  
  if (params.legend) {
    
    var legend = svg.selectAll(".legend")
        .data(colorkeys.slice().reverse())
      .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });
  
    legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", colors);
  
    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) { return d; });
  }
    
    // build the final svg

    
    // TODO legends for non-interactive
    // TODO add tracker vertical line

    if (params.interactive) {

      tooltip = svg.append("g")
      .attr("transform", "translate(30,10)")
      .append("text");

      svg.selectAll(".layer")
      .attr("opacity", 1)
      .on("mouseover", function(d, i) {
        svg.selectAll(".layer").transition()
        .duration(150)
        .attr("opacity", function(d, j) {
          return j != i ? opacity : 1;
        })})

      // track mouse, figure out value, update tooltip

      .on("mousemove", function(dd, i) {

        d3.select("#" + el.id + "-select")
        .selectAll("option")
        .attr("selected", function(d, i) { if (i===0) { return("selected") } });

        function iskey(key) {
          return(function(element) {
            return(element.key==key);
          });
        }

        var subset = data.filter(iskey(dd.key));

        var x0 = x.invert(d3.mouse(this)[0]),
            j = bisectDate(subset, x0, 1),
            d0 = subset[j - 1],
            d1 = subset[j],
            d = x0 - d0.date > d1.date - x0 ? d1 : d0;

        d3.select(this)
        .classed("hover", true)
        .attr("stroke", strokecolor)
        .attr("stroke-width", "0.5px");

        tooltip.text(dd.key + ": " + d.value).attr("fill", params.tooltip);

      })

      // restore opacity/clear tooltip/etc on mouseout

      .on("mouseout", function(d, i) {

        svg.selectAll(".layer")
        .transition()
        .duration(250)
        .attr("opacity", "1");

        d3.select(this)
        .classed("hover", false)
        .attr("stroke-width", "0px");

        tooltip.text("");

      });
    }

    svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .attr("fill", params.text)
    .call(xAxis);

    svg.append("g")
    .attr("class", "y axis")
    .attr("fill", params.text)
    .call(yAxis);

    function onselchange() {

      var selected_value = d3.event.target.value;

      tooltip.text("");

      if (selected_value == "--- Select ---") {

        d3.selectAll("#" + el.id + " .layer")
        .transition()
        .duration(250)
        .attr("opacity", "1")
        .classed("hover", false)
        .attr("stroke-width", "0px");

      } else {

        d3.selectAll("#" + el.id + " .layer")
          .classed("hover", function(d) {
            return d.key != selected_value ? false : true;
          })
          .transition()
          .duration(150)
          .attr("opacity", function(d) {
            return d.key != selected_value ? opacity : 1;
          })
          .attr("stroke", strokecolor)
          .attr("stroke-width", function(d) {
            return d.key != selected_value ? "0px" : "0.5px";
          });
      }

    }

    if (params.legend && params.interactive) {

      if (params.legend_label !== "") {
        d3.select("#" + el.id + "-legend label")
          .text(params.legend_label)
          .style("color", params.label_col);
      }

      var select = d3.select("#" + el.id + "-select")
          .style("visibility", "visible")
          .on('change', onselchange);

      var selopts = d3.set(data.map(function(d) { return(d.key) })).values();
      selopts.unshift("--- Select ---");

      var options = d3.select("#" + el.id + "-select")
         .selectAll('option')
         .data(selopts).enter()
         .append('option')
           .text(function (d) { return d; })
           .attr("value", function (d) { return d; });
    }

    if (params.annotations !== null) {

       var ann = HTMLWidgets.dataframeToD3(params.annotations) ;

       ann.forEach(function(d) {
         if (params.x_scale == "date") {
           d.x = format.parse(d.x);
         } else {
           d.x = +d.x;
         }
       });

       svg.selectAll(".annotation")
          .data(ann)
          .enter().append("text")
          .attr("x", function(d) { return(x(d.x)) ; })
          .attr("y", function(d) { return(y(d.y)) ; })
          .attr("fill", function(d) { return(d.color) ; })
          .style("font-size", function(d) { return(d.size+"px") ; })
          .text(function(d) { return(d.label) ;});
    }

    if (params.markers !== null) {

       var mrk = HTMLWidgets.dataframeToD3(params.markers) ;

       mrk.forEach(function(d) {
         if (params.x_scale == "date") {
           d.x = format.parse(d.x);
         } else {
           d.x = +d.x;
         }
       });

       dbg3 = mrk ;
       svg.selectAll(".marker")
          .data(mrk)
          .enter().append("line")
          .attr("x1", function(d) { return(x(d.x)) ; })
          .attr("x2", function(d) { return(x(d.x)) ; })
          .attr("y1", function(d) { return(y.range()[0]) ; })
          .attr("y2", function(d) { return(y.range()[1]) ; })
          .attr("stroke-width", function(d) { return(d.stroke_width); })
          .attr("stroke", function(d) { return(d.stroke); })
          .attr("stroke-dasharray", "1");

       svg.selectAll(".markerlab")
          .data(mrk)
          .enter().append("text")
          .attr("x", function(d) {
            if (d.anchor=="end") { d.space = -d.space; }
            if (d.anchor=="middle") { d.space = 0; }
            return(x(d.x)+d.space) ;
          })
          .attr("y", function(d) { return(y(d.y)) ; })
          .attr("fill", function(d) { return(d.color) ; })
          .style("font-size", function(d) { return(d.size+"px") ; })
          .style("text-anchor", function(d) { return(d.anchor) ; })
          .text(function(d) { return(d.label) ;});

    }

  },

  resize: function(el, width, height, instance) {
    if (instance.params)
      this.drawGraphic(el, instance.params, width, height);
    }

});
