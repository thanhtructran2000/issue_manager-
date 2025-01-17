odoo.define('issue_manager.testing_project_dashboard', function (require) {
    "use strict";

    var AbstractAction = require('web.AbstractAction');
    var core = require('web.core');
    var QWeb = core.qweb;
    var ajax = require('web.ajax');
    var _t = core._t;

    var TestingProjectDashboard = AbstractAction.extend({
        template: 'TestingProjectDashboard',
        title: 'Dashboard',
        jsLibs: [
            '/issue_manager/static/lib/charts/Chart.js',
            '/issue_manager/static/lib/charts/Chart.bundle.js',
            '/issue_manager/static/lib/charts/chartjs-plugin-datalabels.js',
            '/issue_manager/static/lib/tabulator/js/tabulator.js',
            '/web/static/lib/daterangepicker/daterangepicker.js',
            '/web/static/src/js/libs/daterangepicker.js',
        ],
        cssLibs: [
            '/web/static/lib/daterangepicker/daterangepicker.css',
        ],
        events: {
            'click a': 'hrefLinkClicked',
            'click .view_detail': 'viewDetail',
            'click .redirect_project_detail': 'redirect_project_detail',
            'change #select-project': 'view_project',

        },

        init: function (parent, context) {
            this._super(parent, context);
        },

        willStart: function () {
            var self = this;
            return $.when(ajax.loadLibs(this), this._super()).then(function () {
                return self.fetchData();
            });
        },

        start: function () {
            var self = this;
            return this._super().then(function () {
                self.renderData();
            });
        },

        fetchData: function () {
            var self = this;
            var def1 = this._rpc({
                model: 'testing.project',
                method: 'get_dashboard_data'
            }).then(function (result) {
                self.result = result;
            });

             var def2 = this._rpc({
                model: 'testing.project',
                method: 'get_project_by_id'
            }).then(function (result) {
                self.projects = result;
            });
            return $.when(def1, def2);
        },

        renderData: function () {
            var self = this;
            self.$('#date_range').daterangepicker({
                opens: 'left',
                locale: {
                    format: 'DD/MM/YYYY',
                }
            }, function (start, end, label) {
            });
            this.renderGraph(self.result, self.projects);
             // Binding projects
            var select = this.$el.find('#select-project');
            for (let i = 0; i < self.projects.project_list.length; i++) {
                select.append(new Option(self.projects.project_list[i].name, self.projects.project_list[i].id));
            }
            self.view_project();

        },

        hrefLinkClicked: function (ev) {
            ev.stopPropagation();
            ev.preventDefault();
        },

        viewDetail: function () {

        },




        view_project: function () {
            var self = this;
            var select_val = this.$el.find('#select-project').val()
            for (var i = 0; i < self.projects.project_list.length; i++) {
                if (self.projects.project_list[i].id == select_val) {
                    self.$('#project_code').html(self.projects.project_list[i].code);
                    self.$('#project_manager').html(self.projects.project_list[i].project_manager);
                    self.$('#total_issues').html(self.projects.project_list[i].total_issues);
                    self.$('#times').html(self.projects.project_list[i].times);
                    self.$('#closed').html(self.projects.project_list[i].closed);
                    self.$('#other').html(self.projects.project_list[i].other);
                    this.renderGraph(self.result, self.projects.project_list[i]);
                }
             }
        },
        redirect_project_detail: function(e){
        },

        createLegend: function (chart, chart_type) {
            var text = [];
            text.push('<div class="custom-legend mt-2 mb-2">');
            if (chart_type === 'single') {
                for (var i = 0; i < chart.data.labels.length; i++) {
                    var background_color = chart.data.datasets[0].backgroundColor[i];
                    var datalabel = chart.data.labels[i];
                    text.push(`<div class="inline-block mt-2 mb-2"><span class="legend-block mr-2" style="background-color: ${background_color}"></span>
                            <span class="mr-2">${datalabel}</span></div>`);
                }

            } else {
                for (var i = 0; i < chart.data.datasets.length; i++) {
                    background_color = chart.data.datasets[i].backgroundColor;
                    datalabel = chart.data.datasets[i].label;
                    text.push(`<div class="inline-block mt-2 mb-2"><span class="legend-block mr-2" style="background-color: ${background_color}"></span>
                            <span class="mr-2">${datalabel}</span></div>`);
                }
            }
            text.push('</div>');
            return text.join("");
        },

        shortenLabel: function (label, shorten_type) {
            var value = label;
            if (label >= 1000000000 || label <= -1000000000) {
                value = `${label / 1e9} tỷ`;
            } else if (label >= 1000000 || label <= -1000000) {
                value = `${label / 1e6} triệu`;
            } else if (label >= 1000 || label <= -1000) {
                value = label.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            }
            if (shorten_type === 'percent') {
                return `${value}%`;
            }
            return value;
        },

        renderGraph: function (result, projects) {
            var self = this;
            var ctx = this.$el.find('#LineChart');
            var doughnut_ctx = this.$el.find('#DoughnutChart');
            var bar_ctx = this.$el.find('#BarChart');
            var pie_ctx = this.$el.find('#PieChart');

            // Fills the canvas with white background
            Chart.plugins.register({
                beforeDraw: function (chart) {
                    var ctx = chart.chart.ctx;
                    ctx.fillStyle = "transparent";
                    ctx.fillRect(0, 0, chart.chart.width, chart.chart.height);
                    if (chart.config.options.elements.center) {
                        //Get options from the center object in options
                        var centerConfig = chart.config.options.elements.center;
                        var fontStyle = centerConfig.fontStyle || 'Arial';
                        var txt = centerConfig.text;
                        var color = centerConfig.color || '#fff';
                        var sidePadding = centerConfig.sidePadding || 20;
                        var sidePaddingCalculated = (sidePadding / 100) * (chart.innerRadius * 2)
                        //Start with a base font of 30px
                        ctx.font = "30px " + fontStyle;
                        //Get the width of the string and also the width of the element minus 10 to give it 5px side padding
                        var stringWidth = ctx.measureText(txt).width;
                        var elementWidth = (chart.innerRadius * 2) - sidePaddingCalculated;
                        // Find out how much the font can grow in width.
                        var widthRatio = elementWidth / stringWidth;
                        var newFontSize = Math.floor(30 * widthRatio);
                        var elementHeight = (chart.innerRadius * 2);
                        // Pick a new font size so it will not be larger than the height of label.
                        var fontSizeToUse = Math.min(newFontSize, elementHeight);
                        //Set font settings to draw it correctly.
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        var centerX = ((chart.chartArea.left + chart.chartArea.right) / 2);
                        var centerY = ((chart.chartArea.top + chart.chartArea.bottom) / 2);
                        ctx.font = fontSizeToUse + "px " + fontStyle;
                        ctx.fillStyle = color;
                        //Draw text in center
                        ctx.fillText(txt, centerX, centerY);
                    }
                },
            });
            // Bar chart
            if (bar_ctx.length) {
                var BarChart = new Chart(bar_ctx, {
                    type: 'bar',
                    data: {
                        labels: result.bar_chart_label,
                        indexLabelFontColor: "white",
                        datasets: [{
                            data: result.bar_chart_value,
                            barPercentage: 1,
                            barThickness: 4,
                            backgroundColor: result.bar_chart_color,
                            minBarLength: 0,
                        }],
                    },
                    options: {
                        plugins: {
                            datalabels: {
                                display: false,
                            }
                        },
                        legendCallback: function (chart) {
                            return self.createLegend(chart, 'single');
                        },
                        tooltips: {
                            enabled: true,
                            callbacks: {
                                label: function (tooltipItem, data) {
                                    var label = tooltipItem.yLabel;
                                    return self.shortenLabel(label, 'number');
                                }
                            }
                        },
                        scales: {
                            // hide vertical lines
                            xAxes: [{
                                gridLines: {
                                    display: false,
                                    color: '#1d1d1d'
                                },
                                ticks: {
                                    fontSize: 12,
                                    fontColor: "black",
                                    autoSkip: false,
                                    // maxRotation: 90,
                                    // minRotation: 90
                                }
                            }],
                            yAxes: [{
                                ticks: {
                                    fontSize: 12,
                                    fontColor: "black",
                                    beginAtZero: true,
                                    suggestedMax: result.line_chart_max,
                                    callback: function (label, index, labels) {
                                        return self.shortenLabel(label, 'number');
                                    }
                                },
                                gridLines: {
                                    display: false,
                                    drawBorder: true,
                                    color: '#1d1d1d',
                                },
                            }]
                        },
                        title: {
                            fontSize: 16,
                            fontColor: 'black',
                            display: false,
                            text: '',
                        },
                        responsive: true,
                        maintainAspectRatio: false,
                        legend: {
                            position: 'center',
                            display: false,
                            labels: {
                                fontColor: 'black'
                            }
                        },
                    },
                });
                if (this.$el.find('#BarChart-legends')) {
                    this.$el.find('#BarChart-legends').html(BarChart.generateLegend());
                }
            }

            // Pie chart
            if (pie_ctx.length) {
                var PieChart = new Chart(pie_ctx, {
                    type: 'pie',
                    data: {
                        indexLabelFontColor: "white",
                        labels: projects.pie_chart_label,
                        datasets: [{
                            data: projects.pie_chart_value,
                            backgroundColor: ['rgba(255, 159, 64)', '#24bcfe'],
                        }],
                    },
                    options: {
                        // display value in top of column using chartjs-datalabels-plugin
                        plugins: {
                            datalabels: {
                                display: false,
                            }
                        },
                        legendCallback: function (chart) {
                            return self.createLegend(chart, 'single');
                        },
                        tooltips: {
                            enabled: true,
                            callbacks: {
                                label: function (tooltipItem, data) {
                                    var label = data.datasets[0].data[tooltipItem.index];
                                    return self.shortenLabel(label, 'number');
                                }
                            }
                        },
                        responsive: true,
                        maintainAspectRatio: false,
                        legend: {
                            position: 'bottom',
                            display: false,
                            labels: {
                                fontColor: 'black'
                            }
                        },
                        title: {
                            fontSize: 16,
                            fontColor: 'black',
                            display: false,
                            text: 'Project report',
                        },
                    },
                });
                if (this.$el.find('#PieChart-legends')) {
                    this.$el.find('#PieChart-legends').html(PieChart.generateLegend());
                }
            }
        },
    });

    core.action_registry.add('testing_project_dashboard', TestingProjectDashboard);
    return TestingProjectDashboard;
});
