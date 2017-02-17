/**
 * Numeric directive.
 * Version: 0.9.8-1
 * 
 * Numeric only input. Limits input to:
 * - max value: maximum input value. Default undefined (no max).
 * - min value: minimum input value. Default undefined (no min).
 * - decimals: number of decimals. Default 2.
 * - formatting: apply thousand separator formatting. Default true.
 * - symbol: apply a symbol before or after the number. Default undefined (no symbol).
 * - symbol-pos: sets the position of the symbol. Default 'right'.
 */
(function () {
    'use strict';

    /* global angular */
    angular
        .module('purplefox.numeric', [])
        .directive('numeric', numeric);

    numeric.$inject = ['$locale'];

    function numeric($locale) {
        // Usage:
        //     <input type="text" decimals="3" min="-20" max="40" formatting="false" symbol="$" symbol-pos="left" ></input>
        // Creates:
        // 
        var directive = {
            link: link,
            require: 'ngModel',
            restrict: 'A'
        };
        return directive;


        function link(scope, el, attrs, ngModelCtrl) {
            var decimalSeparator = $locale.NUMBER_FORMATS.DECIMAL_SEP;
            var groupSeparator = $locale.NUMBER_FORMATS.GROUP_SEP;

            // Create new regular expression with current decimal separator.
            var NUMBER_REGEXP = "^\\s*(\\-|\\+)?(\\d+|(\\d*(\\.\\d*)))\\s*$";
            var regex = new RegExp(NUMBER_REGEXP);

            var formatting = true;
            var maxInputLength = 16;            // Maximum input length. Default max ECMA script.
            var max;                            // Maximum value. Default undefined.
            var min;                            // Minimum value. Default undefined.
            var decimals = 2;                   // Number of decimals. Default 2.
            var symbol;                         // Symbol value. Default: undefined.
            var symbolPos = 'right';            // Symbol sign position. Default: 'right'
            var lastValidValue;                 // Last valid value.

            // Create parsers and formatters.
            ngModelCtrl.$parsers.push(parseViewValue);
            ngModelCtrl.$parsers.push(minValidator);
            ngModelCtrl.$parsers.push(maxValidator);
            ngModelCtrl.$formatters.push(formatViewValue);

            el.bind('blur', onBlur);        // Event handler for the leave event.
            el.bind('focus', onFocus);      // Event handler for the focus event.

            // Put a watch on the min, max and decimal value changes in the attribute.
            scope.$watch(attrs.min, onMinChanged);
            scope.$watch(attrs.max, onMaxChanged);
            scope.$watch(attrs.decimals, onDecimalsChanged);
            scope.$watch(attrs.formatting, onFormattingChanged);
            scope.$watch(attrs.symbol, onSymbolChanged);
            scope.$watch(attrs.symbolPos, onSymbolPosChanged);

            // Setup decimal formatting.
            if (decimals > -1) {
                ngModelCtrl.$parsers.push(function (value) {
                    return (value) ? round(value) : value;
                });
                ngModelCtrl.$formatters.push(function (value) {
                    return formatPrecision(value);
                });
            }

            function onMinChanged(value) {
                if (!angular.isUndefined(value)) {
                    min = parseFloat(value);
                    lastValidValue = minValidator(ngModelCtrl.$modelValue);
                    ngModelCtrl.$setViewValue(formatPrecision(lastValidValue));
                    ngModelCtrl.$render();
                }
            }

            function onMaxChanged(value) {
                if (!angular.isUndefined(value)) {
                    max = parseFloat(value);
                    maxInputLength = calculateMaxLength(max);
                    lastValidValue = maxValidator(ngModelCtrl.$modelValue);
                    ngModelCtrl.$setViewValue(formatPrecision(lastValidValue));
                    ngModelCtrl.$render();
                }
            }

            function onDecimalsChanged(value) {
                if (!angular.isUndefined(value)) {
                    decimals = parseFloat(value);
                    maxInputLength = calculateMaxLength(max);
                    if (lastValidValue !== undefined) {
                        ngModelCtrl.$setViewValue(formatPrecision(lastValidValue));
                        ngModelCtrl.$render();
                    }
                }
            }

            function onFormattingChanged(value) {
                if (!angular.isUndefined(value)) {
                    formatting = (value !== false);
                    ngModelCtrl.$setViewValue(formatPrecision(lastValidValue));
                    ngModelCtrl.$render();
                }
            }
            
            function onSymbolChanged(value) {                
                if (!angular.isUndefined(value)) {
                    symbol = value;
                    ngModelCtrl.$setViewValue(formatPrecision(lastValidValue));
                    ngModelCtrl.$render();
                }
            }
            
            function onSymbolPosChanged(value) {
                if (!angular.isUndefined(value)) {
                    symbolPos = value.toLowerCase();
                    if (symbolPos !== 'left' && symbolPos !== 'right') {
                        symbolPos = 'right';
                    }
                    ngModelCtrl.$setViewValue(formatPrecision(lastValidValue));
                    ngModelCtrl.$render();
                }
            }

            /**
             * Round the value to the closest decimal.
             */
            function round(value) {
                var d = Math.pow(10, decimals);
                return Math.round(value * d) / d;
            }

            /**
             * Format a number with the thousand group separator.
             */
            function numberWithCommas(value) {
                if (formatting) {
                    var parts = value.toString().split(decimalSeparator);
                    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator);
                    var valueWithCommas = parts.join(decimalSeparator);
                    return numberWithSymbol(valueWithCommas);
                }
                else {
                    // No formatting applies.
                    return value;
                }
            }

            /**
             * Format a number with the thousand group separator.
             */
            function numberWithSymbol(value) {
                if (symbol && symbolPos === 'left') {
                    return symbol + ' ' + value;
                } else if (symbol && symbolPos === 'right') {
                    return value + ' ' + symbol;
                } else {
                    // No formatting applies.
                    return value;
                }
            }

            /**
             * Format a value with thousand group separator and correct decimal char.
             */
            function formatPrecision(value) {
                if (angular.isUndefined(value) || value === '') {
                    // Checks if 0 is a valid value
                    var minValidated = minValidator(0);
                    var maxValidated = maxValidator(0);
                    if (minValidated === maxValidated && minValidated === 0) {
                        // 0 is a valid value.
                        value = 0;
                    } else if (maxValidated < 0 && angular.isUndefined(min)) {
                        // 0 is above the max value, but there's no minimum, so uses the max
                        value = maxValidated;
                    } else {
                        // Default: uses the min
                        value = minValidated;
                    }
                }
                
                var formattedValue = parseFloat(value).toFixed(decimals);
                formattedValue = formattedValue.replace('.', decimalSeparator);
                return numberWithCommas(formattedValue);
            }

            function formatViewValue(value) {
                return ngModelCtrl.$isEmpty(value) ? '' : '' + value;
            }

            /**
             * Parse the view value.
             */
            function parseViewValue(value) {
                if (angular.isUndefined(value)) {
                    value = '';
                }
                value = value.toString().replace(decimalSeparator, '.');

                // Handle leading decimal point, like ".5"
                if (value.indexOf('.') === 0) {
                    value = '0' + value;
                }

                // Allow "-" inputs only when min < 0
                if (value.indexOf('-') === 0) {
                    if (min >= 0) {
                        value = null;
                        ngModelCtrl.$setViewValue(formatViewValue(lastValidValue));
                        ngModelCtrl.$render();
                    }
                    else if (value === '-') {
                        value = '';
                    }
                }

                var empty = ngModelCtrl.$isEmpty(value);
                if (empty) {
                    lastValidValue = '';
                    //ngModelCtrl.$modelValue = undefined;
                } 
                else {
                    if (regex.test(value) && (value.length <= maxInputLength)) {
                        if (value > max) {
                            lastValidValue = max;
                        }
                        else if (value < min) {
                            lastValidValue = min;
                        }
                        else {
                            lastValidValue = (value === '') ? null : parseFloat(value);
                        }
                    }
                    else {
                        // Render the last valid input in the field
                        ngModelCtrl.$setViewValue(formatViewValue(lastValidValue));
                        ngModelCtrl.$render();
                    }
                }

                return lastValidValue;
            }

            /**
             * Calculate the maximum input length in characters.
             * If no maximum the input will be limited to 16; the maximum ECMA script int.
             */
            function calculateMaxLength(value) {
                var length = 16;
                if (!angular.isUndefined(value)) {
                    length = Math.floor(value).toString().length;
                }
                if (decimals > 0) {
                    // Add extra length for the decimals plus one for the decimal separator.
                    length += decimals + 1; 
                }
                if (min < 0) {
                    // Add extra length for the - sign.
                    length++;
                }
                return length;
            }

            /**
             * Minimum value validator.
             */
            function minValidator(value) {
                if (!angular.isUndefined(min)) {
                    if (!ngModelCtrl.$isEmpty(value) && (value < min)) {
                        return min;
                    } else {
                        return value;
                    }
                }
                else {
                    return value;
                }
            }

            /**
             * Maximum value validator.
             */
            function maxValidator(value) {
                if (!angular.isUndefined(max)) {
                    if (!ngModelCtrl.$isEmpty(value) && (value > max)) {
                        return max;
                    } else {
                        return value;
                    }
                }
                else {
                    return value;
                }
            }


            /**
             * Function for handeling the blur (leave) event on the control.
             */
            function onBlur() {
                var value = ngModelCtrl.$modelValue;
                if (!angular.isUndefined(value)) {
                    // Format the model value.
                    ngModelCtrl.$viewValue = formatPrecision(value);
                    ngModelCtrl.$render();
                }
            }

            
            /**
             * Function for handeling the focus (enter) event on the control.
             * On focus show the value without the group separators.
             */
            function onFocus() {
                var value = ngModelCtrl.$modelValue;
                if (!angular.isUndefined(value)) {
                    ngModelCtrl.$viewValue = value.toString().replace(".", decimalSeparator);
                    ngModelCtrl.$render();
                }
            }
        }
    }

})();

