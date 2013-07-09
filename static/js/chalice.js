"use strict";

angular.module('cpPointsServices', ['ngResource'])
    .factory('Leaderboard', function($resource) {
        return $resource('api/1.0/leaderboard.json', {});
    })
    .factory('User', function($resource) {
        return $resource('api/1.0/users.json', {}, {
            query: {
                method: 'GET',
                isArray: true
            }
        });
    })
    .factory('Point', function($resource) {
        return $resource('api/1.0/point.json', {});
    });

angular.module('cpPoints', ['cpPointsServices'])
    .config(['$routeProvider', function($routeProvider) {
        $routeProvider
            .when('/', {
                templateUrl: 'static/partials/leaderboard.html',
                controller: LeaderboardCtrl
            })
            .when('/chart', {
                templateUrl: 'static/partials/chart.html',
                controller: ChartCtrl
            })
            .otherwise({
                redirectTo: '/'
            });
    }]);

function LeaderboardCtrl($scope, Leaderboard, User, Point) {
    $scope.receivers = {};
    $scope.givers = {};

    $scope.assignLeaderboard = function() {
        $scope.givers = $scope.leaderboard.given;
        $scope.receivers = $scope.leaderboard.received;
    };

    $scope.leaderboard = Leaderboard.get($scope.assignLeaderboard);

    $scope.users = User.query();

    $scope.addPoints = function() {
        var point = new Point({
            source: $scope.pointsSource.name,
            target: $scope.pointsTarget.name,
            amount: $scope.pointsAmount
        });
        point.$save(function(data) {
            $scope.leaderboard = Leaderboard.get($scope.assignLeaderboard);
        });
    };
}
//LeaderboardCtrl.$inject = ['$scope', 'Leaderboard', 'User', 'Point'];

function ChartCtrl($scope) {
    ChalicePoints.Chord('received');
}
//ChartCtrl.$inject = ['$scope'];

var ChalicePoints = {
    type: 'received'
};

ChalicePoints.Chord = function(type) {
    ChalicePoints.type = type || 'received';

    var elem = document.getElementById('chart');
    if (!elem) {
        return false;
    }

    elem.innerHTML = '';

    var width = 650;
    var height = 650;
    var outerRadius = Math.min(width, height) / 2;
    var innerRadius = outerRadius - 45;

    var arc = d3.svg.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    var layout = d3.layout.chord()
        .padding(.04)
        .sortSubgroups(d3.descending)
        .sortChords(d3.ascending);

    var path = d3.svg.chord()
        .radius(innerRadius);

    var svg = d3.select('#chart').append('svg')
        .attr('width', width)
        .attr('height', height)
    .append('g')
        .attr('id', 'circle')
        .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

    svg.append('circle')
        .attr('r', outerRadius);

    var colors = d3.scale.category20();

    d3.json('api/1.0/users.json', function(users) {
        d3.json('api/1.0/matrix/' + ChalicePoints.type + '.json', function(matrix) {
            layout.matrix(matrix);

            var group = svg.selectAll('.group')
                .data(layout.groups)
            .enter().append('g')
                .attr('class', 'group')
                .on('mouseover', mouseover);

            group.append('title').text(function(d, i) {
                return users[i].name  + ': ' + Math.round(d.value);
            });

            var groupPath = group.append('path')
                .attr('id', function(d, i) {
                    return 'group' + i;
                })
                .attr('d', arc)
                .style('fill', function(d, i) {
                    return colors(i);
                });

            var groupText = group.append('text')
                .attr('x', 0)
                .attr('dy', 16);

            groupText.append('textPath')
                .attr('xlink:href', function(d, i) {
                    return '#group' + i;
                })
                .text(function(d, i) {
                    return users[i].name;
                });

            groupText.filter(function(d, i) {
                return groupPath[0][i].getTotalLength() / 2 - 16 < this.getComputedTextLength();
            }).remove();

            var chord = svg.selectAll('.chord')
                .data(layout.chords)
            .enter().append('path')
                .attr('class', 'chord')
                .style('fill', function(d) {
                    return colors(d.source.index);
                })
                .attr('d', path);

            chord.append('title').text(function(d) {
                if (ChalicePoints.type == 'received') {
                    return users[d.target.index].name
                        + ' -> ' + users[d.source.index].name
                        + ': ' + d.source.value;
                } else {
                    return users[d.source.index].name
                        + ' -> ' + users[d.target.index].name
                        + ': ' + d.source.value
                }
            });

            function mouseover(d, i) {
                chord.classed('fade', function(p) {
                    return p.source.index != i;
                });
            }
        });
    });
};

function matrixChoice(type) {
    ChalicePoints.Chord(type);
}
