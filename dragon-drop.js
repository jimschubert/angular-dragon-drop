/*
 * angular-dragon-drop v1.0.1
 * (c) 2013-2015 Brian Ford http://briantford.com
 * License: MIT
 */
(function () {
    'use strict';

    var REPEATER_EXP = /^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+track\s+by\s+([\s\S]+?))?\s*(?:\|\s+([\s\S]+?))?\s*$/;

    angular.module('dragon-drop', []).
        directive('dragon', ['$document', '$compile', '$rootScope', function ($document, $compile, $rootScope) {
            /*
             NOTE: ASCII dragon slayed, not removed.
             */
            // this ASCII dragon is really important, do not remove

            var dragValue,
                dragKey,
                dragOrigin,
                dragDuplicate = false,
                dragEliminate = false,
                mouseReleased = true,
                floaty,
                offsetX,
                offsetY,
                fixed;

            var isFixed = function (element) {
                var parents = element.parent(), i, len = parents.length;
                for (i = 0; i < len; i++) {
                    if (parents[i].hasAttribute('data-dragon-fixed')) {
                        return true;
                    } else if (parents[i].hasAttribute('data-dragon')) {
                        return false;
                    }
                }
                return false;
            };

            var drag = function (ev) {
                var x = ev.clientX - offsetX,
                    y = ev.clientY - offsetY;

                floaty.css('left', x + 'px');
                floaty.css('top', y + 'px');
            };

            var remove = function (collection, index) {
                if (angular.isArray(collection)) {
                    return collection.splice(index, 1);
                } else {
                    var temp = collection[index];
                    delete collection[index];
                    return temp;
                }
            };

            var add = function (collection, item, key, position) {
                if (angular.isArray(collection)) {
                    var pos;
                    if (position === 0 || position) {
                        pos = position;
                    } else {
                        pos = collection.length;
                    }
                    collection.splice(pos, 0, item);
                } else {
                    collection[key] = item;
                }
            };

            var findContainer = function (elem) {
                var children = elem.find('*');

                for (var i = 0; i < children.length; i++) {
                    if (children[i].hasAttribute('data-dragon-container')) {
                        return angular.element(children[i]);
                    }
                }

                return null;
            };

            var documentBody = angular.element($document[0].body);

            var disableSelect = function () {
                documentBody.css({
                    '-moz-user-select': '-moz-none',
                    '-khtml-user-select': 'none',
                    '-webkit-user-select': 'none',
                    '-ms-user-select': 'none',
                    'user-select': 'none'
                });
            };

            var enableSelect = function () {
                documentBody.css({
                    '-moz-user-select': '',
                    '-khtml-user-select': '',
                    '-webkit-user-select': '',
                    '-ms-user-select': '',
                    'user-select': ''
                });
            };

            var killFloaty = function () {
                if (floaty) {
                    $rootScope.$broadcast('drag-end');
                    $document.unbind('mousemove', drag);
                    floaty.scope().$destroy();
                    floaty.remove();
                    floaty = null;
                    enableSelect();
                }
            };

            var getElementOffset = function (elt) {

                var box = elt.getBoundingClientRect();
                //var body = $document[0].body;
                var body = $document[0].documentElement;

                var xPosition = box.left + body.scrollLeft;
                var yPosition = box.top + body.scrollTop;

                return {
                    left: xPosition,
                    top: yPosition
                };
            };

            // Get the element at position (`x`, `y`) behind the given element
            var getElementBehindPoint = function (behind, x, y) {
                var originalDisplay = behind.css('display');
                behind.css('display', 'none');

                var element = angular.element($document[0].elementFromPoint(x, y));

                behind.css('display', originalDisplay);

                return element;
            };

            $document.bind('mouseup', function (ev) {
                mouseReleased = true;

                if (!dragValue) {
                    return;
                }

                var dropArea = getElementBehindPoint(floaty, ev.clientX, ev.clientY);

                var accepts = function () {
                    return (dropArea.attr('data-dragon') || angular.isDefined(dropArea.attr('data-dragon-trash')) ) &&
                        ( !dropArea.attr('data-dragon-accepts') ||
                        dropArea.scope().$eval(dropArea.attr('data-dragon-accepts'))(dragValue) );
                };

                while (dropArea.length > 0 && !accepts()) {
                    dropArea = dropArea.parent();
                }

                if (dropArea.attr('data-dragon-sortable') !== undefined) {

                    var min = dropArea[0].getBoundingClientRect().top;
                    var max = dropArea[0].getBoundingClientRect().bottom;
                    var positions = [];
                    var position;

                    positions.push(min);

                    var i, j, leni, lenj;
                    for (i = 0, leni = dropArea[0].children.length; i < leni; i++) {
                        var totalHeight = 0;
                        var smallestTop = Number.POSITIVE_INFINITY;
                        for (j = 0, lenj = dropArea[0].children[i].getClientRects().length; j < lenj; j++) {
                            if (smallestTop > dropArea[0].children[i].getClientRects()[j].top) {
                                smallestTop = dropArea[0].children[i].getClientRects()[j].top;
                            }
                            totalHeight += dropArea[0].children[i].getClientRects()[j].height;
                        }
                        if (dropArea[0].children[i].attributes['data-dragon-position'] !== undefined) {
                            positions.push(smallestTop + (totalHeight / 2));
                        }

                    }

                    positions.push(max);

                    i = 0;
                    while (i < positions.length) {
                        if (positions[i] <= ev.clientY) {
                            position = i;
                        }
                        i++;
                    }

                }

                if (dropArea.length > 0) {
                    var isList = angular.isDefined(dropArea.attr('data-dragon')),
                        isTrash = angular.isDefined(dropArea.attr('data-dragon-trash'));
                    if (isList) {
                        var expression = dropArea.attr('data-dragon');
                        var dropCallback = dropArea.attr('data-dragon-on-drop');
                        var targetScope = dropArea.scope();
                        var match = expression.match(REPEATER_EXP);

                        var targetList = targetScope.$eval(match[2]);
                        var targetCallback = targetScope.$eval(dropCallback);

                        targetScope.$apply(function () {
                            add(targetList, dragValue, dragKey);
                            if (targetCallback && angular.isFunction(targetCallback)) {
                                targetCallback(dragValue, dragKey);
                            }
                        });
                    }
                    else if (isTrash) {
                        // noop
                    }
                } else if (!dragDuplicate && !dragEliminate) {
                    // no dropArea here
                    // put item back to origin
                    $rootScope.$apply(function () {
                        add(dragOrigin, dragValue, dragKey);
                    });
                }

                dragValue = dragOrigin = null;
                killFloaty();

            });

            return {
                restrict: 'A',

                compile: function (container, attr) {

                    // get the `thing in things` expression
                    var expression = attr.dragon;
                    var match = expression.match(REPEATER_EXP);
                    if (!match) {
                        throw new Error('Expected dragon in form of "_item_ in _collection_ [as _alias_] [track by _track_] [| _filter_]" but got "' +
                        expression + '"."');
                    }
                    var iterateItem = match[1];
                    var enumerableCollection = match[2];
                    /* FYI?:
                     var alias = match[3];
                     var tracking = match[4];
                     var filter = match[5];
                     */

                    match = iterateItem.match(/^(?:([\$\w]+)|\(([\$\w]+)\s*,\s*([\$\w]+)\))$/);

                    var valueIdentifier = match[3] || match[1];
                    var keyIdentifier = match[2];

                    var duplicate = container.attr('data-dragon-duplicate') !== undefined;

                    // pull out the template to re-use.
                    // Improvised ng-transclude.
                    if (container.attr('data-dragon-base') !== undefined) {
                        container = findContainer(container);

                        if (!container) {
                            throw new Error('Expected data-dragon-base to be used with a companion data-dragon-conatiner');
                        }
                    }

                    var template = container.html();

                    // wrap text nodes
                    try {
                        template = angular.element(template.trim());
                        if (template.length === 0) {
                            throw new Error('');
                        }
                    }
                    catch (e) {
                        template = angular.element('<span>' + template + '</span>');
                    }
                    var child = template.clone();
                    child.attr('ng-repeat', expression);

                    if (container.attr('data-dragon-sortable') !== undefined) {
                        child.attr('data-dragon-position', '{{$index}}');
                    }

                    container.html('');
                    container.append(child);

                    var eliminate = container.attr('data-dragon-eliminate') !== undefined;

                    return function (scope, elt, attr) {

                        var accepts = scope.$eval(attr.dragonAccepts);

                        if (accepts !== undefined && typeof accepts !== 'function') {
                            throw new Error('Expected dragonAccepts to be a function.');
                        }

                        var spawnFloaty = function () {
                            $rootScope.$broadcast('drag-start');
                            scope.$apply(function () {
                                floaty = template.clone();

                                floaty.css('position', 'fixed');

                                floaty.css('margin', '0px');
                                floaty.css('z-index', '99999');

                                var floatyScope = scope.$new();
                                floatyScope[valueIdentifier] = dragValue;
                                if (keyIdentifier) {
                                    floatyScope[keyIdentifier] = dragKey;
                                }
                                $compile(floaty)(floatyScope);
                                documentBody.append(floaty);
                                $document.bind('mousemove', drag);
                                disableSelect();
                            });
                        };

                        elt.bind('mousedown', function (ev) {

                            //If a person uses middle or right mouse button, don't do anything
                            if ([1, 2].indexOf(ev.button) > -1) {
                                return;
                            }

                            var tag = $document[0].elementFromPoint(ev.clientX, ev.clientY).tagName;
                            if (tag === 'SELECT' || tag === 'INPUT' || tag === 'BUTTON') {
                                return;
                            } else {

                                mouseReleased = false;

                                if (isFixed(angular.element(ev.target))) {
                                    fixed = true;
                                } else {
                                    fixed = false;
                                }

                            }

                            ev.preventDefault();
                        });

                        elt.bind('mousemove', function (ev) {
                            if (dragValue || mouseReleased) {
                                return;
                            }

                            if (isFixed(angular.element(ev.target)) || fixed) {
                                return;
                            }

                            // find the right parent
                            var originElement = angular.element(ev.target);
                            var originScope = originElement.scope();

                            while (originScope[valueIdentifier] === undefined) {
                                originScope = originScope.$parent;
                                if (!originScope) {
                                    return;
                                }
                            }

                            dragValue = originScope[valueIdentifier];
                            dragKey = originScope[keyIdentifier];
                            if (!dragValue) {
                                return;
                            }

                            // get offset inside element to drag
                            var offset = getElementOffset(ev.target);

                            dragOrigin = scope.$eval(enumerableCollection);
                            if (duplicate) {
                                dragValue = angular.copy(dragValue);
                            } else {
                                scope.$apply(function () {
                                    remove(dragOrigin, dragKey || dragOrigin.indexOf(dragValue));
                                });
                            }
                            dragDuplicate = duplicate;
                            dragEliminate = eliminate;

                            offsetX = (ev.clientX - offset.left);
                            offsetY = (ev.clientY - offset.top);

                            spawnFloaty();
                            drag(ev);

                        });
                    };
                }
            };
        }]);

})();
