(function($){
    $('body').tooltip({
        selector: "*[data-toggle=tooltip]"
    });
})(jQuery);

/******************************************************************/
//helper functions
function safeApply(scope, fn) {
    var phase = scope.$root.$$phase;
    if(phase === '$apply' || phase === '$digest')
        scope.$eval(fn);
    else
        scope.$apply(fn);
}

//update entity
function updateEntity(source, destination) {
    if(typeof source === typeof  destination) {
        angular.copy(source, destination);
    }
}

var userConfig = {
    'clientId': '512508236814-d35qanajio78edinfs3sekn56g8ia07l.apps.googleusercontent.com',
    'scopes': 'https://www.googleapis.com/auth/calendar'
};

//define applicaton
var saturnApp = angular.module('saturnApp', ['ui', 'ui.bootstrap', 'ngResource']);

saturnApp.config(['$routeProvider', function($routeProvider) {
        $routeProvider.
            when('/', {templateUrl: 'partials/index.html'}).
            when('/settings', {templateUrl: 'partials/settings.html'}).
            when('/calendar/:calendarId/settings', {templateUrl: 'partials/calendar-settings.html'}).
            when('/calendar/create', {templateUrl: 'partials/calendar-settings.html'}).
            otherwise({redirectTo: '/'});
    }
    ]).run(function($rootScope){
        $rootScope.config = {
            'baseURL': 'https://www.googleapis.com/calendar/v3',
            'collapsed': {
            }
        };

        $rootScope.dataCache = {
            'activeCalendars': [],
            'calendarList': {
                'personal': [],
                'subscribed': []
            }
        };

        $rootScope.user = {
            'loggedIn': false
        };

        $rootScope.logout = function(){
            $rootScope.user.loggedIn = false;
        }
    });

/******************************************************************/
saturnApp.filter('encodeURIComponent', function() {
    return window.encodeURIComponent;
});

/******************************************************************/
//ACL
saturnApp.factory('ACL', function($resource, $rootScope){
    return $resource(
        $rootScope.config.baseURL + '/calendars/:calendarId/acl/:ruleId',
        {
            'calendarId': '@calendarId',
            'ruleId': '@ruleId'
        },
        {
            'insert': {
                'method': 'POST'
            },
            'list': {
                'method': 'GET'
            },
            'update': {
                'method': 'PUT'
            },
            'patch': {
                'method': 'patch'
            }
        }
    );
});

//Calendar List
saturnApp.factory('CalendarList', function($resource, $rootScope){
    return $resource(
        $rootScope.config.baseURL + '/users/:user/calendarList/:calendarId',
        {
            'user': 'me',
            'calendarId': '@calendarId'
        },
        {
            'insert': {
                'method': 'POST'
            },
            'list': {
                'method': 'GET'
            },
            'update': {
                'method': 'PUT'
            },
            'patch': {
                'method': 'patch'
            }
        }
    );
});

//Calendars
saturnApp.factory('Calendars', function($resource, $rootScope){
    return $resource(
        $rootScope.config.baseURL + '/calendars/:calendarId',
        {
            'calendarId': '@calendarId'
        },
        {
            'clear': {
                'method': 'POST',
                'url': $rootScope.config.baseURL + '/calendars/:calendarId/clear'
            },
            'insert': {
                'method': 'POST'
            },
            'update': {
                'method': 'PUT'
            },
            'patch': {
                'method': 'PATCH'
            }
        }
    );
});

//Colors
saturnApp.factory('Colors', function($resource, $rootScope){
    return $resource(
        $rootScope.config.baseURL,
        {
            'get': {
                'method': 'GET',
                'url': $rootScope.config.baseURL + '/colors'
            }
        }
    );
});

//Events
saturnApp.factory('Events', function($resource, $rootScope){
    return $resource(
        $rootScope.config.baseURL,
        {
            'calendarId': '@calendarId',
            'eventId': '@eventId',
            'access_token': '@access_token'
        },
        {
            'delete': {
                'method': 'DELETE',
                'url': $rootScope.config.baseURL + '/calendars/:calendarId/events/:eventId'
            },
            'get': {
                'method': 'GET',
                'url': $rootScope.config.baseURL + '/calendars/:calendarId/events/:eventId'
            },
            'import': {
                'method': 'POST',
                'url': $rootScope.config.baseURL + '/calendars/:calendarId/events/import'
            },
            'insert': {
                'method': 'POST',
                'url': $rootScope.config.baseURL + '/calendars/:calendarId/events'
            },
            'instances': {
                'method': 'GET',
                'url': $rootScope.config.baseURL + '/calendars/:calendarId/events/:eventId/instances'
            },
            'list': {
                'method': 'GET',
                'url': $rootScope.config.baseURL + '/calendars/:calendarId/events'
            },
            'move': {
                'method': 'POST',
                'URL': $rootScope.config.baseURL + '/calendars/:calendarId/events/:eventId/move'
            },
            'quickAdd': {
                'method': 'POST',
                'url': $rootScope.config.baseURL + '/calendars/:calendarId/events/quickAdd'
            },
            'update': {
                'method': 'POST',
                'url': $rootScope.config.baseURL + '/calendars/:calendarId/events/:eventId'
            },
            'patch': {
                'method': 'PATCH',
                'url': $rootScope.config.baseURL + '/calendars/:calendarId/events/:eventId'
            }
        }
    );
});

//Colors
saturnApp.factory('Freebusy', function($resource, $rootScope){
    return $resource(
        $rootScope.config.baseURL,
        {
            'query': {
                'method': 'POST',
                'url': $rootScope.config.baseURL + '/freeBusy'
            }
        }
    );
});

//Settings
saturnApp.factory('Settings', function($resource, $rootScope){
    return $resource(
        $rootScope.config.baseURL,
        {
            'userId' : '@userId',
            'setting': '@setting'
        },
        {
            'get': {
                'method': 'GET',
                'url': $rootScope.config.baseURL + '/users/:userId/settings/:setting'
            },
            'list': {
                'method': 'GET',
                'url': $rootScope.config.baseURL + '/users/:userId/settings'
            }
        }
    );
});

/******************************************************************/
/* Events */
saturnApp.controller('EventController', function($scope, $rootScope, $filter, Events){
    $scope.events  = [];
    $scope.eventSources = $scope.events;

    var events = null,
        i = 0;

    function displayEvents(sources){
        $rootScope.$broadcast('loading:Started');

        if(i < sources.length){
            events = Events.list({
                'calendarId': sources[i].id,
                'access_token': $rootScope.dataCache.access_token
            });

            events.$then(function(){
                $scope.events.push({
                    'events': events.items,
                    'color': sources[i].backgroundColor,
                    'textColor': sources[i].foregroundColor
                });

                i++;

                if(i === sources.length){
                    $rootScope.$broadcast('loading:Finished');

                    i = 0;
                    return;
                }

                displayEvents(sources);
            });
        }
    }

    function listEvents(sources){
        angular.forEach(sources, function(value, key){
            displayEvents(value);
        });
    }

    $rootScope.$on('calendar:CalendarListLoaded', function(){
        listEvents($rootScope.dataCache.calendarList);
    });

    $rootScope.$on('calendar:CalendarListUpdated', function(){
        listEvents();
    });

    $scope.resetEventDetails = function(start, end){
        $scope.action = 'Add';

        var date = new Date(),
            d = date.getDate(),
            m = date.getMonth(),
            y = date.getFullYear(),
            H = date.getHours(),
            M  = date.getMinutes();

        switch (true) {
            case (M < 15):
                M = 15;

                break;

            case (M < 30):
                M = 30;

                break;

            case (M < 45):
                M = 45;

                break;

            case (M < 60):
                M = 60;

                break;
        }

        var startDate = start ? start : new Date(y, m, d, H, M),
            endDate = end ? end : new Date(y, m, d, H + 1, M);
    };

    $scope.resetEventDetails();

    /*******************************************************/
        //called after the user has selected something in the calendar
    $scope.select = function(startDate, endDate, allDay, jsEvent, view){
    };

    //when you click on an event
    $scope.eventClick = function(event, jsEvent, view){
        if(event.editable || event.source.editable) {
        }

        if(event.url) {
            window.open(event.url, 'eventPreview', 'width=400, height=400');
        }

        return false;
    };

    //after you drag and drop an event
    $scope.eventDrop = function(event, dayDelta, minuteDelta, allDay, revertFunc, jsEvent, ui, view){

    };

    //after you resize an event
    $scope.eventResize = function( event, dayDelta, minuteDelta, revertFunc, jsEvent, ui, view ) {

    };

    //save new event
    $scope.save = function(){
    };

    //remove an event
    $scope.remove = function(index){
    };

    //got to a new date
    $scope.$watch('currentDate', function() {
        if($scope.currentDate !== undefined){
            //go to the specified date
            $scope.calendar.fullCalendar('gotoDate', $scope.currentDate);
        }
    });

    /*******************************************************/
        //calendar configuration
    $scope.extendedCalendar = {
        header:{
            left: 'month agendaWeek agendaDay',
            center: 'title',
            right: 'today prev,next'
        },
        editable:  true,
        selectable: true,
        defaultView: 'agendaWeek',
        slotMinutes: 15,
        eventClick: $scope.eventClick,
        eventDrop: $scope.eventDrop,
        eventResize: $scope.eventResize,
        eventRender: function(event, element, view){
            var content = '';

            content += '<div class="event-dates"><i class="icon-calendar"></i> ' + $filter('date')(event.start, 'dd/MM/yyyy') + ', ';
            content +=  $filter('date')(event.start, 'shortTime');
            if(event.end){
                content += ' - ' + $filter('date')(event.end, 'dd/MM/yyyy') + ', ';
                content += $filter('date')(event.start, 'shortTime');
            }
            content += '</div>';

            if(event.description) {
                content += '<p class="event-description">' + event.description + '</p>';
            }

            if(event.location) {
                content += '<div class="event-location">' + event.location + '</div>';
            }

            element.popover({
                'title': event.title,
                'content': content,
                'html': true,
                'trigger': 'hover',
                'placement': 'top',
                'delay': 200
            });
        },
        viewDisplay: function(view){
            $scope.dateCache = $scope.calendar.fullCalendar('getDate');
        },
        loading: function(bool){
            if(!bool) {
                $scope.calendar.fullCalendar('gotoDate', $scope.dateCache);
            }
        },
        select: $scope.select,
        unselect: $scope.unselect
    };

    $scope.miniCalendar = {
        header:{
            left: '',
            center: 'title',
            right: 'today prev,next'
        },
        editable:  false,
        selectable: false,
        columnFormat: {
            day: 'D'
        },
        eventRender: function(){
            return false;
        },
        dayClick: function(date, allDay, jsEvent, view){
            $scope.$apply(function(){
                $scope.currentDate = date;
            });
        }
    };
});

/******************************************************************/
/* Calendars */
saturnApp.controller('CalendarController', function($scope, $rootScope, CalendarList, Calendars){
    function initActiveCalendars(){
        angular.forEach($rootScope.dataCache.calendarList.items,function(value, key){
            if($rootScope.dataCache.calendarList.items[key].selected === true && $rootScope.dataCache.activeCalendars.indexOf($rootScope.dataCache.calendarList.items[key].id) === -1) {
                $rootScope.dataCache.activeCalendars.push($rootScope.dataCache.calendarList.items[key].id);
            }
        });
    }

    $rootScope.$on('calendar:CalendarListLoaded', function(){
        initActiveCalendars();
    });

    $scope.updateActiveCalendars = function(){
        var calendarID = this.calendar.id,
            selected = this.calendar.selected;

        if(selected && $rootScope.dataCache.activeCalendars.indexOf(calendarID) === -1){
            $rootScope.dataCache.activeCalendars.push(calendarID);
        } else {
            $rootScope.dataCache.activeCalendars.splice(calendarID, 1);
        }

        $rootScope.$broadcast('calendar:CalendarListUpdated');
    };

    //test color picker
    $scope.colorPickerTest = function(){
        console.log(this.colorPicker);
    };

    //set the current calendar so we can access it later
    $scope.setCurrentCalendar = function(){
        $rootScope.dataCache.currentCalendar = $rootScope.dataCache.calendarList.items[this.$index];
        $rootScope.dataCache.currentCalendarClone = angular.copy($rootScope.dataCache.calendarList.items[this.$index]);
    };

    //save current calendar info
    $scope.saveCalendar = function(){
        updateEntity($rootScope.dataCache.currentCalendarClone, $rootScope.dataCache.currentCalendar);

        Calendars.update({
            'calendarId': $rootScope.dataCache.currentCalendarClone.id,
            'description': $rootScope.dataCache.currentCalendarClone.description,
            'location': $rootScope.dataCache.currentCalendarClone.location,
            'access_token': $rootScope.dataCache.access_token
        });
    };

    //clear current calendar info
    $scope.resetCalendar = function(){
        updateEntity($rootScope.dataCache.currentCalendar, $rootScope.dataCache.currentCalendarClone);

        Calendars.update({
            'calendarId': $rootScope.dataCache.currentCalendar.id,
            'description': $rootScope.dataCache.currentCalendar.description,
            'location': $rootScope.dataCache.currentCalendar.location,
            'access_token': $rootScope.dataCache.access_token
        });
    };
});

/******************************************************************/
/* Settings */
saturnApp.controller('SettingsController', function($scope, $rootScope){
});

//User
saturnApp.controller('UserController', function($scope, $rootScope, CalendarList){
    $scope.checkAuth = function(){
        gapi.auth.authorize({
            'client_id': userConfig.clientId,
            'scope': userConfig.scopes,
            'immediate': false
        }, authCallback);
    };

    function authCallback(response){
        if(response && !response.error) {
            //notify everyone that we're loading some data
            $rootScope.$broadcast('loading:Started');

            $rootScope.user.loggedIn = true;

            safeApply($rootScope, function(){
                $rootScope.dataCache.access_token = response.access_token;

                var promise = CalendarList.list({
                    'access_token': $rootScope.dataCache.access_token
                });

                promise.$then(function(){
                    sortCalendars(promise.items, function(){
                        $rootScope.$broadcast('calendar:CalendarListLoaded');
                    });
                });
            });
        }
    }

    //sort calendars by access role
    function sortCalendars(calendars, callback){
        angular.forEach(calendars, function(value, key){
            //personal calendars
            if(calendars[key].accessRole === 'owner'){
                $rootScope.dataCache.calendarList.personal.push(calendars[key]);
            }

            //subscribed calendars
            if(calendars[key].accessRole === 'reader'){
                $rootScope.dataCache.calendarList.subscribed.push(calendars[key]);
            }
        });

        if(callback && typeof callback === 'function'){
            callback();
        }
    }
});
