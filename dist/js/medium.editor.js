/*! medium.editor - v0.1.0 - 2013-05-30 */// http://stackoverflow.com/questions/5605401/insert-link-in-contenteditable-element
// by Tim Down
function saveSelection() {
    'use strict';
    var i,
        len,
        ranges,
        sel;
    if (window.getSelection) {
        sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
            ranges = [];
            for (i = 0, len = sel.rangeCount; i < len; i += 1) {
                ranges.push(sel.getRangeAt(i));
            }
            return ranges;
        }
    } else if (document.selection && document.selection.createRange) {
        return document.selection.createRange();
    }
    return null;
}

function restoreSelection(savedSel) {
    'use strict';
    var i,
        len,
        sel;
    if (savedSel) {
        if (window.getSelection) {
            sel = window.getSelection();
            sel.removeAllRanges();
            for (i = 0, len = savedSel.length; i < len; i += 1) {
                sel.addRange(savedSel[i]);
            }
        } else if (document.selection && savedSel.select) {
            savedSel.select();
        }
    }
}

// http://stackoverflow.com/questions/6139107/programatically-select-text-in-a-contenteditable-html-element
// by Tim Down
function selectElementContents(el) {
    'use strict';
    var range = document.createRange(),
        sel = window.getSelection();
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);
}

// http://stackoverflow.com/questions/2880957/detect-inline-block-type-of-a-dom-element
// by Andy E
function getElementDefaultDisplay(tag) {
    'use strict';
    var cStyle,
        t = document.createElement(tag),
        gcs = window.getComputedStyle !== undefined;

    document.body.appendChild(t);
    cStyle = (gcs ? window.getComputedStyle(t, "") : t.currentStyle).display;
    document.body.removeChild(t);

    return cStyle;
}

/*global restoreSelection*/
/*global selectElementContents*/
/*global getElementDefaultDisplay*/
/*global console*/

function mediumEditor(selector, options) {
    'use strict';
    return this.init(selector, options);
}

(function (window, document) {
    'use strict';
    mediumEditor.prototype = {
        init: function (selector, options) {
            return this.initElements(selector)
                       .initToolbar()
                       .bindSelect()
                       .bindButtons()
                       .bindAnchorForm();
        },

        initElements: function (selector) {
            var elements = document.querySelectorAll(selector),
                i;
            for (i = 0; i < elements.length; i += 1) {
                elements[i].setAttribute('contentEditable', true);
            }
            return this;
        },

        initToolbar: function () {
            this.toolbar = this.getOrCreateToolbar();
            this.keepToolbarAlive = false;
            this.anchorForm = document.getElementById('medium-editor-toolbar-form-anchor');
            this.toolbarActions = document.getElementById('medium-editor-toolbar-actions');
            return this;
        },

        // TODO: show toolbar buttons based on options
        // TODO: parametrize input placeholder
        getOrCreateToolbar: function () {
            var toolbar = document.getElementById('medium-editor-toolbar');
            if (toolbar === null) {
                toolbar = document.createElement('div');
                toolbar.id = 'medium-editor-toolbar';
                toolbar.className = 'medium-editor-toolbar';
                toolbar.innerHTML = '<ul class="clearfix" id="medium-editor-toolbar-actions">' +
                                    '    <li><a href="#" data-action="bold">B</a></li>' +
                                    '    <li><a href="#" data-action="italic">I</a></li>' +
                                    '    <li><a href="#" data-action="underline">S</a></li>' +
                                    '    <li><a href="#" data-action="anchor">#</a></li>' +
                                    '    <li><a href="#" data-action="append-h3">h1</a></li>' +
                                    '    <li><a href="#" data-action="append-h4">h2</a></li>' +
                                    '    <li><a href="#" data-action="append-blockquote">"</a></li>' +
                                    '</ul>' +
                                    '<div class="medium-editor-toolbar-form-anchor" id="medium-editor-toolbar-form-anchor">' +
                                    '    <input type="text" value="" placeholder="Digite ou cole um link"><a href="#">x</a>' +
                                    '</div>';
                document.getElementsByTagName('body')[0].appendChild(toolbar);
            }
            return toolbar;
        },

        bindSelect: function () {
            var self = this;
            document.onmouseup = function (e) {
                self.checkSelection(e);
            };
            document.onkeyup = function (e) {
                self.checkSelection(e);
            };
            return this;
        },

        checkSelection: function (e) {
            var newSelection;
            if (this.keepToolbarAlive !== true) {
                newSelection = window.getSelection();
                if (newSelection.toString().trim() === '') {
                    this.toolbar.style.display = 'none';
                } else {
                    this.selection = newSelection;
                    this.selectionRange = this.selection.getRangeAt(0);
                    this.setToolbarPosition();
                    this.toolbar.style.display = 'block';
                    this.showToolbarActions();
                }
            }
            return this;
        },

        setToolbarPosition: function () {
            var coords = this.getSelectionCoordinates();
            this.toolbar.style.left = (coords[0] + 20) + 'px';
            this.toolbar.style.top = (coords[1] + 20) + 'px';
        },

        getSelectionCoordinates: function () {
            var box,
                posEl = document.createElement('span'),
                range = this.selection.getRangeAt(0);
            range.insertNode(posEl);
            box = posEl.getBoundingClientRect();
            posEl.parentNode.removeChild(posEl);
            this.selection.addRange(range);
            return [box.left, box.top];
        },

        // TODO: break method
        bindButtons: function () {
            var action,
                buttons = this.toolbar.querySelectorAll('a'),
                i,
                self = this,
                triggerAction = function (e) {
                    e.preventDefault();
                    action = this.getAttribute('data-action');
                    if (action.indexOf('append-') > -1) {
                        self.appendEl(action.replace('append-', ''));
                    } else if (action === 'anchor') {
                        if (self.selection.anchorNode.parentNode.tagName.toLowerCase() === 'a') {
                            document.execCommand('unlink', null, false);
                        } else {
                            if (self.anchorForm.style === 'block') {
                                self.showToolbarActions();
                            } else {
                                self.showAnchorForm();
                            }
                        }
                    } else {
                        document.execCommand(action, null, false);
                    }
                };
            for (i = 0; i < buttons.length; i += 1) {
                buttons[i].onclick = triggerAction;
            }
            return this;
        },

        appendEl: function (el) {
            var selectionEl = this.selection.anchorNode.parentNode;
            if (selectionEl.tagName.toLowerCase() === el || selectionEl.tagName.toLowerCase() === 'span') {
                el = 'p';
            }
            if (getElementDefaultDisplay(selectionEl.tagName) !== 'block') {
                selectionEl = selectionEl.parentNode;
            }
            el = document.createElement(el);
            el.innerHTML = selectionEl.innerHTML;
            el.setAttribute('contentEditable', true);
            selectionEl.parentNode.replaceChild(el, selectionEl);
            selectElementContents(el);
            this.setToolbarPosition();
        },

        showToolbarActions: function () {
            this.anchorForm.style.display = 'none';
            this.toolbarActions.style.display = 'block';
            this.keepToolbarAlive = false;
            document.onclick = '';
        },

        showAnchorForm: function () {
            var input = this.anchorForm.querySelector('input'),
                self = this;
            this.toolbarActions.style.display = 'none';
            this.savedSelection = saveSelection();
            this.anchorForm.style.display = 'block';
            this.keepToolbarAlive = true;
            input.focus();
            input.value = '';
            clearTimeout(this.timer);
            this.timer = setTimeout(function () {
                document.onclick = function (e) {
                    self.keepToolbarAlive = false;
                    self.toolbar.style.display = 'none';
                    this.onclick = '';
                };
            }, 300);
        },

        bindAnchorForm: function () {
            var input = this.anchorForm.querySelector('input'),
                linkCancel = this.anchorForm.querySelector('a'),
                self = this;

            this.anchorForm.onclick = function (e) {
                e.stopPropagation();
            };

            input.onkeydown = function (e) {
                if (e.keyCode === 13) {
                    e.preventDefault();
                    self.createLink(this);
                }
            };

            linkCancel.onclick = function (e) {
                self.showToolbarActions();
                restoreSelection(self.savedSelection);
            };
        },

        createLink: function (input) {
            restoreSelection(this.savedSelection);
            document.execCommand('CreateLink', false, input.value);
            this.showToolbarActions();
            input.value = '';
        }
    };
}(window, document));