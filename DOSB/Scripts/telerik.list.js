﻿(function ($) {

    var $t = $.telerik;

    $t.list = {
        initialize: function () {
            this.previousValue = this.value();

            $t.bind(this, {
                dataBinding: this.onDataBinding,
                dataBound: this.onDataBound,
                error: this.onError,
                open: this.onOpen,
                close: this.onClose,
                valueChange: this.onChange,
                load: this.onLoad
            });

            $(document.documentElement).bind('mousedown', $.proxy(function (e) {
                var $dropDown = this.dropDown.$element;
                var isDropDown = $dropDown && $dropDown.parent().length > 0;

                if (isDropDown && !$.contains(this.element, e.target) && !$.contains($dropDown.parent()[0], e.target)) {
                    this.trigger.change();
                    this.trigger.close();
                }

            }, this));
        },

        common: function () {
            this.open = function () {
                if (this.data.length == 0) return;

                var $element = this.$element;
                var dropDown = this.dropDown;

                var position = {
                    offset: $element.offset(),
                    outerHeight: $element.outerHeight(),
                    outerWidth: $element.outerWidth(),
                    zIndex: $t.getElementZIndex($element[0])
                }

                if (dropDown.$items) dropDown.open(position);
                else this.fill(function () { dropDown.open(position); });
            }

            this.close = function () {
                this.dropDown.close();
            }

            this.dataBind = function (data, preserveStatus) {
                data = data || [];
                this.data = data;
                for (var i = 0, length = data.length; i < length; i++) {
                    if (data[i].Selected) this.index = i;
                }
                this.dropDown.dataBind(this.data);
                if (!preserveStatus) {
                    this.text('');
                    this.$input.val('');
                }
            }

            this.highlight = function (argument) {

                var rebind = function (component) {
                    var previousValue = component.previousValue;
                    var dropDown = component.dropDown;
                    component.close();
                    dropDown.dataBind(component.data);
                    component.previousValue = previousValue;
                    dropDown.$items
                            .removeClass('t-state-selected')
                            .eq(index)
                            .addClass('t-state-selected');
                }

                var index = -1;

                if (!this.data) return index;

                if (!isNaN(argument - 0)) { // index
                    if (argument > -1 && argument < this.data.length) {

                        index = argument;

                        rebind(this);
                    }

                } else if ($.isFunction(argument)) { // predicate

                    for (var i = 0, len = this.data.length; i < len; i++) {
                        if (argument(this.data[i])) {
                            index = i;
                            break;
                        }
                    }

                    if (index != -1)
                        rebind(this);

                } else { // dom node
                    index = this.dropDown.highlight(argument);
                }

                return index;
            }
        },

        filtering: function () {
            this.filter = function (component) {

                component.isFiltered = true;

                var performAjax = true;
                var data = component.data;
                var input = component.$text[0];
                var text = input.value;
                var trigger = component.trigger;
                var dropDown = component.dropDown;

                text = this.multiple(text);

                if (text.length < component.minChars) return;

                var filterIndex = component.filter;
                if (component.loader.isAjax()) {

                    if (component.cache && data && data.length > 0) {

                        component.filters[filterIndex](component, data, text);

                        var filteredDataIndexes = component.filteredDataIndexes;

                        if ((filteredDataIndexes && filteredDataIndexes.length > 0)
                        || (filterIndex == 0 && component.selectedIndex != -1))
                            performAjax = false;
                    }

                    if (performAjax) {

                        var postData = {};
                        postData[component.queryString.text] = text;

                        component.loader.ajaxRequest(function (data) {
                            var trigger = component.trigger;
                            var dropDown = component.dropDown;

                            if (data && data.length == 0) {
                                dropDown.close();
                                dropDown.dataBind();
                                return;
                            }

                            component.data = data;

                            $t.trigger(component.element, 'dataBound');

                            component.filters[filterIndex](component, data, text);

                            var $items = dropDown.$items;
                            if ($items.length > 0) {
                                if (!dropDown.isOpened()) trigger.open();
                                component.filtering.autoFill(component, $items.first().text());
                            }
                            else trigger.close();

                        }, { data: postData });
                    }
                } else {
                    performAjax = false;
                    component.filters[filterIndex](component, component.data, text);
                }

                if (!performAjax) {
                    var $items = dropDown.$items;
                    var itemsLength = $items.length;
                    var selectedIndex = component.selectedIndex;

                    var itemText = filterIndex == 0
                    ? selectedIndex != -1
                    ? $items[selectedIndex].innerText || $items[selectedIndex].textContent
                    : ''
                    : $items.length > 0
                    ? $items.first().text()
                    : '';

                    this.autoFill(component, itemText);

                    if (itemsLength == 0)
                        trigger.close();
                    else {
                        if (!dropDown.isOpened())
                            trigger.open();
                    }
                }
            }

            this.multiple = function (text) { return text; } // overriden by autocomplete
        },

        filters: function () { //mixin
            this.filters = [
                function firstMatch(component, data, inputText) {
                    if (!data || data.length == 0) return;
                    var dropDown = component.dropDown;
                    var $items = dropDown.$items;

                    if ($items.length == 0 || component.loader.isAjax()) {
                        dropDown.dataBind(data);
                        $items = dropDown.$items;
                    }

                    for (var i = 0, length = data.length; i < length; i++) {
                        if (data[i].Text.slice(0, inputText.length).toLowerCase() == inputText.toLowerCase()) {
                            var item = $items[i];

                            component.selectedIndex = i;
                            dropDown.highlight(item);
                            dropDown.scrollTo(item);
                            return;
                        }
                    }

                    $items.removeClass('t-state-selected');
                    component.selectedIndex = -1;

                    $t.list.highlightFirstOnFilter(component, $items);
                },

                createItemsFilter(false, function (inputText, itemText) {
                    return itemText.slice(0, inputText.length).toLowerCase() == inputText.toLowerCase();
                }),

                createItemsFilter(true, function (inputText, itemText) {
                    return itemText && itemText.toLowerCase().indexOf(inputText.toLowerCase()) != -1
                })
            ]
        },

        loader: function (component) {
            this.ajaxError = false;
            this.component = component;

            this.isAjax = function () {
                return component.ajax || component.ws || component.onDataBinding;
            }

            function ajaxOptions(complete, options) {
                var result = {
                    url: (component.ajax || component.ws)['selectUrl'],
                    type: 'POST',
                    data: {},
                    dataType: 'text', // using 'text' instead of 'json' because of DateTime serialization
                    error: function (xhr, status) {
                        component.loader.ajaxError = true;
                        if ($t.ajaxError(component.element, 'error', xhr, status))
                            return;
                    },
                    complete: $.proxy(function () { this.hideBusy(); }, component.loader),

                    success: function (data, status, xhr) {
                        try {
                            data = eval('(' + data + ')');
                        } catch (e) {
                            // in case the result is not JSON raise the 'error' event
                            if (!$t.ajaxError(component.element, 'error', xhr, 'parseeror'))
                                alert('Error! The requested URL did not return JSON.');
                            component.loader.ajaxError = true;
                            return;
                        }
                        data = data.d || data; // Support the `d` returned by MS Web Services 

                        if (complete)
                            complete.call(component, data);

                    }
                }

                $.extend(result, options);

                if (component.ws) {
                    result.data = $t.toJson(result.data);
                    result.contentType = 'application/json; charset=utf-8';
                }

                return result;
            }

            this.ajaxRequest = function (complete, options) {
                var e = {};

                if ($t.trigger(component.element, 'dataBinding', e))
                    return;

                if (component.ajax || component.ws) {
                    this.showBusy();
                    $.ajax(ajaxOptions(complete, { data: $.extend({}, options ? options.data : {}, e.data) }));
                }
                else
                    if (complete) complete.call(component, component.data);
            },

            this.showBusy = function () {
                this.busyTimeout = setTimeout($.proxy(function () {
                    this.component.$element.find('> .t-dropdown-wrap .t-icon').addClass('t-loading');
                }, this), 100);
            },

            this.hideBusy = function () {
                clearTimeout(this.busyTimeout);
                this.component.$element.find('> .t-dropdown-wrap .t-icon').removeClass('t-loading');
            }
        },

        trigger: function (component) {
            this.component = component;
            this.change = function () {
                var data = component.data;
                var text = component.text();
                var lowerText = text.toLowerCase();
                var previousValue = component.previousValue;

                //find if text has exact match with one of data items.
                for (var i = 0, len = data.length; i < len; i++) {
                    var item = data[i];
                    if ((item.Text ? item.Text : item).toLowerCase() == lowerText) {
                        component.text(item.Text);
                        component.$input.val(item.Value == null ? item.Text : item.Value);
                        break;
                    }
                }

                var value = component.value();
                if (previousValue == undefined || value != previousValue)
                    $t.trigger(component.element, 'valueChange', { value: value });

                component.previousValue = value;
            }

            this.open = function () {
                var dropDown = component.dropDown;
                if ((dropDown.$items && dropDown.$items.length > 0) && !dropDown.isOpened() && !$t.trigger(component.element, 'open'))
                    component.open();
            }

            this.close = function () {
                if (!component.dropDown.$element.is(':animated') && component.dropDown.isOpened() && !$t.trigger(component.element, 'close'))
                    component.close();
            }
        },

        highlightFirstOnFilter: function (component, $items) {
            if (component.highlightFirst) {
                $items.first().addClass('t-state-selected');
                component.dropDown.scrollTo($items[0]);
            }
        },

        moveToEnd: function (element) {
            if (element.createTextRange) {
                var range = element.createTextRange();
                range.moveStart('textedit', 1);
                range.select();
            }
        },

        selection: function (input, start, end) {
            if (input.createTextRange) {
                var selRange = input.createTextRange();
                selRange.collapse(true);
                selRange.moveStart('character', start);
                selRange.moveEnd('character', end - start);
                selRange.select();
            } else if (input.selectionStart) {
                input.selectionStart = start;
                input.selectionEnd = end;
            }
        },

        updateTextAndValue: function (component, text, value) {
            component.text(text);

            if (value == null)
                component.$input.val(text);
            else
                component.$input.val(value);


        },

        getZIndex: function (element) {
            var zIndex = 'auto';
            $(element).parents().andSelf().each(function () { //get element 
                zIndex = $(this).css('zIndex');
                if (Number(zIndex)) {
                    zIndex = Number(zIndex) + 1;
                    return false;
                }
            });
            return zIndex;
        },

        keycodes: [8, // backspace
                   9, // tab
                  13, // enter
                  27, // escape
                  37, // left arrow
                  38, // up arrow
                  39, // right arrow
                  40, // down arrow
                  35, // end
                  36, // home
                  46] // delete
    }

    function createItemsFilter(global, condition) {
        return function (component, data, inputText) {

            if (!data || data.length == 0) return;

            var filteredDataIndexes = $.map(data, function (item, index) {
                if (condition(inputText, item.Text || item)) return index;
            });

            var filteredDataIndexesLength = filteredDataIndexes.length;
            var formatRegExp = new RegExp("(?![^&;]+;)(?!<[^<>]*)(" + inputText.replace(/([\^\$\(\)\[\]\{\}\*\.\+\?\|\\])/gi, "\\$1") + ")(?![^<>]*>)(?![^&;]+;)", global ? 'ig' : 'i');

            component.filteredDataIndexes = filteredDataIndexes;
            component.selectedIndex = -1;

            component.dropDown.onItemCreate = function (e) { e.html = e.html.replace(formatRegExp, "<strong>$1</strong>"); }
            component.dropDown.dataBind($.map(filteredDataIndexes, function (item, index) {
                return data[item];
            }));

            var $items = component.dropDown.$items;
            $items.removeClass('t-state-selected');
            $t.list.highlightFirstOnFilter(component, $items);
        };
    }

    function firstMatch(data, $items, text) {
        if (!data || !$items) return null;

        var valueLength = text.length;
        text = text.toLowerCase();

        for (var i = 0, length = data.length; i < length; i++) {
            if (data[i].Text.slice(0, valueLength).toLowerCase() == text)
                return $items[i];
        }
    }

    $t.dropDownList = function (element, options) {
        $.extend(this, options);

        var cachedInput = '';
        var $element = $(element);

        //allow element to be focused
        if (!$element.attr('tabIndex')) $element.attr('tabIndex', 0);

        this.element = element;
        this.$element = $element;
        this.loader = new $t.list.loader(this);
        this.trigger = new $t.list.trigger(this);
        this.$text = $element.find('> .t-dropdown-wrap > .t-input');
        this.$input = this.$element.find('input:last');

        this.dropDown = new $t.dropDown({
            attr: this.dropDownAttr,
            effects: this.effects,
            onClick: $.proxy(function (e) {
                this.select(e.item);
                this.trigger.change();
                this.trigger.close();
            }, this)
        });

        this.dropDown.$element.css('direction', $element.closest('.t-rtl').length ? 'rtl' : '');

        this.fill = function (callback) {
            function updateSelectedItem(component) {
                var selector;
                var value = component.value();

                if (value) {
                    selector = function (dataItem) { return value == (dataItem.Value || dataItem.Text); };
                } else {
                    var $items = component.dropDown.$items;
                    var selectedIndex = component.index;
                    var $selectedItems = $items.filter('.t-state-selected')
                    var selectedItemsLength = $selectedItems.length;

                    var selector = selectedIndex != -1 && selectedIndex < $items.length
                            ? selectedIndex
                            : selectedItemsLength > 0
                            ? selectedItemsLength - 1
                            : 0;
                }

                component.select(selector);
            }

            var dropDown = this.dropDown;
            var loader = this.loader;

            if (!dropDown.$items && !loader.ajaxError) {
                if (loader.isAjax()) {
                    loader.ajaxRequest(function (data) {
                        this.data = data;

                        this.dataBind(data);
                        updateSelectedItem(this);

                        $t.trigger(this.element, 'dataBound');
                        this.trigger.change();

                        if (callback) callback();
                    });
                }
                else {
                    this.dataBind(this.data);
                    updateSelectedItem(this);

                    if (callback) callback();
                }
            }
        }

        this.enable = function () {
            $element
            .removeClass('t-state-disabled')
            .bind({
                keydown: $.proxy(keydown, this),
                keypress: $.proxy(keypress, this),
                click: $.proxy(function (e) {
                    var trigger = this.trigger;
                    var dropDown = this.dropDown;

                    $element.focus();

                    if (dropDown.isOpened())
                        trigger.close();
                    else if (!dropDown.$items)
                        this.fill(trigger.open);
                    else
                        trigger.open();
                }, this)
            });
        }

        this.disable = function () {
            $element
            .addClass('t-state-disabled')
            .unbind('click');
        }

        this.reload = function () {
            this.dropDown.$items = null;
            this.fill();
        }

        this.select = function (item) {
            var index = this.highlight(item);

            if (index == -1) return index;

            this.selectedIndex = index;

            $t.list.updateTextAndValue(this, $(this.dropDown.$items[index]).text(), this.data[index].Value);
        }

        this.text = function (text) {
            if (text !== undefined)
                this.$text.html(text || '&nbsp');
            else
                return this.$text.html();
        }

        this.value = function (value) {
            if (value !== undefined) {
                var index = this.select(function (dataItem) {
                    return value == dataItem.Value;
                });

                if (index == -1) {
                    index = this.select(function (dataItem) {
                        return value == dataItem.Text;
                    });
                }

                if (index != -1)
                    this.previousValue = value; //prevent change event


            } else {
                return this.$input.val();
            }
        }

        $t.list.common.call(this);
        $t.list.initialize.call(this);

        this[this.enabled ? 'enable' : 'disable']();

        // PRIVATE methods
        function resetTimer() {
            clearTimeout(this.timeout);
            this.timeout = setTimeout($.proxy(function () { cachedInput = '' }, this), 1000);
        }

        function keydown(e) {

            var trigger = this.trigger;
            var dropDown = this.dropDown;
            var key = e.keyCode || e.which;

            // close dropdown
            if (e.altKey && key == 38) {
                trigger.close();
                return;
            }

            // open dropdown
            if (e.altKey && key == 40) {
                trigger.open();
                return;
            }

            if (key > 34 && key < 41) {

                e.preventDefault();

                if (!dropDown.$items) {
                    this.fill();
                    return;
                }

                var $items = dropDown.$items;
                var $selectedItem = $($items[this.selectedIndex]);

                var $item = (key == 35) ? $items.last() // end
                         : (key == 36) ? $items.first() // home
                         : (key == 37 || key == 38) ? $selectedItem.prev() // up
                         : (key == 39 || key == 40) ? $selectedItem.next() // down
                         : [];

                if ($item.length) {
                    var item = $item[0];

                    this.select(item);
                    dropDown.scrollTo(item);

                    if (!dropDown.isOpened())
                        trigger.change();
                }
            }

            if (key == 8) {
                resetTimer();
                e.preventDefault();
                cachedInput = cachedInput.slice(0, -1);
            }

            if (key == 9 || key == 13 || key == 27) {
                trigger.change();
                trigger.close();
            }
        }

        function keypress(e) {
            var dropDown = this.dropDown;
            var key = e.keyCode || e.charCode;

            if (key == 0 || $.inArray(key, $t.list.keycodes) != -1 || e.ctrlKey || e.altKey || e.shiftKey) return;

            if (!dropDown.$items) {
                this.fill();
                return;
            }

            var tempInputValue = cachedInput;

            tempInputValue += String.fromCharCode(key);

            if (tempInputValue) {

                var item = firstMatch(this.data, dropDown.$items, tempInputValue);

                if (item) {
                    this.select(item);
                    dropDown.scrollTo(item);
                }

                cachedInput = tempInputValue;
            }

            resetTimer();
        }
    }

    $.fn.tDropDownList = function (options) {
        return $t.create(this, {
            name: 'tDropDownList',
            init: function (element, options) {
                return new $t.dropDownList(element, options)
            },
            options: options
        });
    };

    // default options
    $.fn.tDropDownList.defaults = {
        effects: $t.fx.slide.defaults(),
        accessible: false,
        index: 0,
        enabled: true
    };

})(jQuery);