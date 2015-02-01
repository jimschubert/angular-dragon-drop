/*************************************************************************
 ................................../...\..................................
 ._........................)......((...)).....(...........................
 (@)....................../|\......))_((...../|\..........................
 |-|.................... / | \....(/\|/\).. / | \......................(@)
 | | -------------------/--|-voV---\`|'/--Vov-|--\---------------------|-|
 |-|                         '^`   (o o)  '^`                          | |
 | |                               `\Y/'                               |-|
 |-|  dragon-drop v1.0.3                                               | |
 | |  (c) 2013-2015 Brian Ford http://briantford.com                   |-|
 |-|                                                                   | |
 | |  License: MIT                                                     |-|
 |_|___________________________________________________________________| |
 (@)..............l   /\ /..........( (......\ /\   l................`\|-|
 .................l /...V...........\ \.......V...\ l..................(@)
 .................l/................_) )_ .........\I.....................
 ...................................`\ /'.................................
 .....................................`..Art by Jeff Ferris...............
 *************************************************************************/
(function () {
    'use strict';

    var REPEATER_EXP = /^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+track\s+by\s+([\s\S]+?))?\s*(?:\|\s+([\s\S]+?))?\s*$/;

    angular.module('dragon-drop', []).
        directive('dragon', ['$document', '$compile', '$rootScope', '$http', '$templateCache', '$window', function ($document, $compile, $rootScope, $http, $templateCache, $window) {
            var dragValue,
                dragKey,
                lastOverElement,
                jsObject,
                placeholder,
                placeholderTemplate,
                dragDuplicate = false,
                dragEliminate = false,
                mouseReleased = true,
                floaty,
                offsetX,
                offsetY,
                fixed,
                documentBody = angular.element($document[0].body),
                mouse = {x: 0, y: 0};

            $document[0].addEventListener('mousemove', function(e){
                mouse.x = e.clientX || e.pageX;
                mouse.y = e.clientY || e.pageY
            }, false);

            var check = function(attr){
                return function(elem){
                    return angular.isDefined(angular.element(elem).attr(attr));
                };
            };

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
                var elm;

                if(placeholder) {
                    elm = whereBeDragons(getElementBehindPoint(floaty, mouse.x, mouse.y)[0]);

                    if(elm) {
                        elm = angular.element(elm);
                        // TODO: Use CSS transitions here instead of DOM manipulation?
                        // see http://blog.stevensanderson.com/2013/03/15/animating-lists-with-css-3-transitions/
                        if (elm !== lastOverElement && !isPlaceholder(elm)) {

                            var oldPlaceholder = placeholder;
                            newPlaceholder();

                            // handle normal items differently from container/base cases
                            if (isBase(elm)) {
                                // TODO: append if moving down, prepend if moving up.
                                // NOTE: This is likely broken
                                var container = findContainer(elm);
                                angular.element(oldPlaceholder).remove();
                                elm[0].insertBefore(placeholder, container);
                            } else {
                                angular.element(oldPlaceholder).remove();

                                // this assumes the -sortable attribute and list-only (not grid)
                                var pos = elm.attr('data-dragon-position');
                                if(angular.isUndefined(pos)||pos===0){
                                    var parent = findParentDragon(elm[0]);
                                    parent[0].insertBefore(placeholder, parent[0].firstChild);
                                } else {
                                    elm[0].appendChild(placeholder);
                                }
                            }
                            lastOverElement = angular.element(placeholder);
                        } else {
                            lastOverElement = elm;
                        }
                    }
                }

                floaty.css('left', (ev.clientX - offsetX) + 'px');
                floaty.css('top', (ev.clientY - offsetY) + 'px');
            };

            var newPlaceholder = function(){
                var p = angular.element(placeholderTemplate);
                p.attr('data-dragon-placeholder',true);
                placeholder = p[0];
                return p;
            };

            var isPlaceholder = check('data-dragon-placeholder');
            var isSortItem = check('data-dragon-position');
            var isContainer = check('data-dragon-container');
            var isBase = check('data-dragon-base');
            var isDragon = check('data-dragon');

            /**
             * Finds a dragon element containing the node element
             * @param {Node} item
             * @returns {*}
             */
            var whereBeDragons = function(item){
                var found,
                    current = item;

                do {
                    var elem = angular.element(current);
                    if( isPlaceholder(elem) ||
                        isContainer(elem) ||
                        isSortItem(elem) ||
                        isDragon(elem)
                    ) {
                        found = current;
                    } else {
                        current = current.parentElement;
                    }
                } while(!found && current);

                if(angular.isDefined(found)){
                    return found;
                } else {
                    return null;
                }
            };

            /**
             * Finds a parent dragon element (not just any known dragon element).
             * @param {Node} item
             * @returns {*}
             */
            var findParentDragon = function(item){
                var current = item;
                while (current) {
                    var elem = angular.element(current);
                    if(isDragon(elem)){
                        return elem;
                    } else {
                        current = current.parentElement;
                    }
                }

                return null;
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
                var element,
                    originalDisplay = behind.css('display');
                behind.css('display', 'none');

                element = angular.element($document[0].elementFromPoint(x, y));

                behind.css('display', originalDisplay);

                return element;
            };

            $document.bind('mouseup', function (ev) {
                mouseReleased = true;

                var positions = [];
                var position;

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

                if(placeholder){
                    angular.element(placeholder).remove();
                    placeholder = null;
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
                            add(targetList, dragValue, dragKey, position);
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
                        add(jsObject, dragValue, dragKey, position);
                    });
                }

                dragValue = jsObject = null;
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

                    // Create a closure over per-element settings.
                    var duplicate = container.attr('data-dragon-duplicate') !== undefined;
                    var eliminate = container.attr('data-dragon-eliminate') !== undefined;
                    var placeholderUrl = container.attr('data-dragon-placeholder-template');

                    return function (scope, elt, attr) {

                        var accepts = scope.$eval(attr.dragonAccepts),
                            instanceTemplate = angular.isDefined(placeholderUrl) ? $templateCache.get(placeholderUrl) : null;

                        if (accepts !== undefined && typeof accepts !== 'function') {
                            throw new Error('Expected dragonAccepts to be a function.');
                        }

                        var spawnFloaty = function () {
                            $rootScope.$broadcast('drag-start');
                            scope.$apply(function () {
                                floaty = template.clone();

                                floaty[0].style.cssText = $window.getComputedStyle(template[0], null).cssText;

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
                                fixed = !!isFixed(angular.element(ev.target));
                            }

                            if(angular.isDefined(placeholderUrl)){
                                if (!angular.isDefined(instanceTemplate)) {
                                    $http({
                                        method: 'GET',
                                        url: placeholderUrl,
                                        cache: true
                                    })
                                        .then(function (result) {
                                            placeholderTemplate = instanceTemplate = (result && result.data);
                                        });
                                } else {
                                    placeholderTemplate = instanceTemplate;
                                }
                            } else {
                                placeholderTemplate = null;
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

                            jsObject = scope.$eval(enumerableCollection);

                            // the mousemove operation can only happen on one element at a time,
                            // requested settings get set as directive-level properties so they
                            // can be bound within non-private handlers (like document#mousemove)
                            dragDuplicate = duplicate;
                            dragEliminate = eliminate;

                            offsetX = (ev.clientX - offset.left);
                            offsetY = (ev.clientY - offset.top);

                            if (duplicate) {
                                dragValue = angular.copy(dragValue);
                            } else {
                                var eltChildren = elt.children();
                                var placeholderCandidate;

                                if(placeholderTemplate){
                                    for(var i = 0; !placeholderCandidate && i < eltChildren.length; i++) {
                                        var elem = eltChildren[i];
                                        // elem may be removed immediately following this, so we need the previous iterable template,
                                        // which may not be the previous sibling
                                        if(angular.element(elem).scope()[keyIdentifier||valueIdentifier] === dragValue){
                                            if(i > 0){
                                                placeholderCandidate = eltChildren[i-1];
                                            }
                                        }
                                    }
                                }

                                scope.$apply(function () {
                                    remove(jsObject, dragKey || jsObject.indexOf(dragValue));

                                    if(placeholderTemplate){
                                        newPlaceholder();
                                        if(angular.isUndefined(placeholderCandidate)){
                                            elt[0].insertBefore(placeholder, elt[0].firstChild);
                                        } else {
                                            angular.element(placeholderCandidate).after(placeholder);
                                        }
                                    } else {
                                        placeholder = null;
                                    }
                                });
                            }

                            spawnFloaty();
                        });
                    };
                }
            };
        }]);

})();
