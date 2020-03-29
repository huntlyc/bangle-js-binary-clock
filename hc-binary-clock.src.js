let fullTimeDisplayTimout; //set when showing regular time at the bottom of the screen (after BTN1 press)

const fontColor = {
    regular: '#42c8e3', // Teal (ish)
    darker: '#3295a8', // Darker (ish) Teal (ish)
    highlight: '#c21bac' // HotPink(tm)
};


/**
 * Small date/time module, exposes the following methods:
 *
 * getCurrentDate() - returns object with 'value' prop (raw array) and toString() method
 * getCurrentTime() - returns object with 'value' prop (raw array) and toString() method
 */
const dateTime = () => {

    /**
     * will turn [[1,2],[0,1],[5,9]] into [1,2,0,1,59]
     * @param {Array} array - Greater than 1D array
     * @returns {Array} array - a 1D representation of the input array
     */
    const flattenArray = (array = []) => [].concat.apply([], array);

    /**
     * Turns 1 into [0,1] or 20 into [2,0]
     * @param {Number} number
     * @returns {Array}
     */
    const arrayFormatZeroPad = number => {
        const numberStr = number.toString();
        return numberStr.length === 1 ? ["0", numberStr] : numberStr.split("");
    };


    /**
     * Returns an array of [h,h,m,m,s,s]
     * @returns {Array}
     */
    const getCurrentTime = () => {
        const now = new Date();
        const timeArr = flattenArray([now.getHours(), now.getMinutes(), now.getSeconds()].map(arrayFormatZeroPad));

        return {
            value: timeArr,
            toString: function(){ // returns hh:mm
                let timeStr = '';
                timeStr += timeArr[0] + timeArr[1] + ':';
                timeStr += timeArr[2] + timeArr[3];
                return timeStr
            }
        }
    };


    /**
     * Returns an array of [d,d,m,m,y,y,y,y]
     */
    const getCurrentDate = () => {
        const now = new Date();
        const dateArr = flattenArray([now.getDate(), now.getMonth() + 1, now.getFullYear()].map(arrayFormatZeroPad));

        return {
            value: dateArr,
            toString: function(){ // returns dd/mm/yyyy
                let dateStr = '' + dateArr[0] + dateArr[1] + '/';
                dateStr += dateArr[2] + dateArr[3] + '/';
                dateStr += dateArr[4] + dateArr[5] + dateArr[6] + dateArr[7];
                return dateStr;
            }
        }
    };

    return {
        getCurrentDate: getCurrentDate,
        getCurrentTime: getCurrentTime
    }

}

let prevFrame = []; // holds our last frame data so we only update what we need to
const drawClock = () => {
    const numberOfColumns = 6; // 6 digits - hh:mm:ss
    const drawFullGrid = false; // show empty dots even if never needed?
    const offset = { x: 40, y: 60 }; //used to position the clock a bit more centered

    const canvasWidth = 160; // don't go full screen, leave room for widgets & date

    /**
     * colWidth is the current X position we're drawing in,
     * initially set to 1 col width
     **/
    const colWidth =  canvasWidth / numberOfColumns;


    /**
     * circleDiamater is the diamater of our dots in relation to the colWidth
     * and ammount of cols
     */
    const circleDiamater = ( canvasWidth / numberOfColumns) / 2.5;


    /**
     * Converts a number into binary representation (as an array)
     * e.g 2 [0, 1, 0, 0]
     *
     * @param {Number} number - the value to convert
     * @return {Array} array - binary representation of that number
     **/
    const findBinary = target => {
        return [
            [0,0,0,0], // 0
            [0,0,0,1], // 1
            [0,0,1,0], // 2
            [0,0,1,1], // 3
            [0,1,0,0], // 4
            [0,1,0,1], // 5
            [0,1,1,0], // 6
            [0,1,1,1], // 7
            [1,0,0,0], // 8
            [1,0,0,1]  // 9

            // [0, 0, 0, 0],  // 0
            // [1, 0, 0, 0],  // 1
            // [0, 1, 0, 0],  // 2
            // [1, 1, 0, 0],  // 3
            // [0, 0, 1, 0],  // 4
            // [1, 0, 1, 0],  // 5
            // [0, 1, 1, 0],  // 6
            // [1, 1, 1, 0],  // 7
            // [0, 0, 0, 1],  // 8
            // [1, 0, 0, 1],  // 9
        ][target];
    };

    /**
     *
     * @param {Number} columnIndex - column number we're drawing
     * @param {Array} bits  - full column data
     */
    const drawColumn = (columnIndex = 0, bits = [0, 0, 0, 0]) => {
        g.setColor(fontColor.regular);

        /**
         * We don't need over a certian amount of digets for certain colums
         * e.g. the first digit of the hour never goes above 2
         *
         * Define our maximum dots per column
         **/
        const maxDotsPerColumn = [2, 4, 3, 4, 3, 4];

        // Figurou out our xpos based on the column number and width
        const xPos = columnIndex * colWidth;
        let yPos = colWidth / 2;

        /**
         * @uses xPos - current x position
         * @uses yPos - currren y position
         * @uses colWidth - column width
         * @uses offset - offset from top/left of the screen {y, x}
         * @uses circleDiamater - diamater of our circle (less than colWidth)
         *
         * @param {String} fn - function to call.  Either 'drawCircle' or 'fillCircle'
         */
        const drawDot = fn => {
            if(fn === 'drawCircle'){
                g.setColor(fontColor.darker);
            }
            g[fn]((xPos + colWidth / 2) + offset.x, yPos + offset.y, circleDiamater);
            g.setColor(fontColor.regular);
        };

        /**
         * Draw Logic
         * ==========
         * - Loop through our bits of data and draw them.
         * - If drawFullGrid is false, will only draw the max useful circles per column
         *
         * Note: Will only update bits that have changed since last draw to reduce wasted cpu use
         */
        for (let i = 0; i < bits.length; i += 1) {

            /**
             * Don't use more dots than is necessary to show the max value of our column.
             * i.e. max time is 23:59 so never show more than:
             *
             * Hours
             * -----
             *  - 2 bits for first hour digit [0 - 2]
             *  - 4 bits for second hour digit [0 - 9]
             *
             * Minute
             * ------
             *  - 3 bits for first minute digit [0 - 5]
             *  - 4 bits for second minute digit [0 - 9]
             *
             * Second
             * ------
             *  - 3 bits for first second digit [0 - 5]
             *  - 4 bits for second second digit [0 - 9]
             *
             * Note: if drawFullGrid is set to 'true' this is ignored and
             * all bits are drawn regardless if they're usefull or not.  It's a style choice.
             *
             **/
            if (i + maxDotsPerColumn[columnIndex] >= 4 || drawFullGrid) {
                // Check for prev frame data
                if (prevFrame && prevFrame[columnIndex] && prevFrame[columnIndex][i]) {
                    // Check data is different before redrawing
                    if (bits[i] !== prevFrame[columnIndex][i]) {

                        // Blank out our bit
                        g.clearRect(
                            ((xPos + colWidth / 2) - 15) + offset.x,
                            (yPos - 15) + offset.y,
                            ((xPos + colWidth / 2) + 20) + offset.x,
                            (yPos + 20) + offset.y
                        );

                        //Draw our bit - filled circle == 1, empty circle == 0
                        drawDot(((bits[i]) ? 'fillCircle' : 'drawCircle'));
                    }
                } else { // no prev frame data, carry on...

                    //Draw our bit - filled circle == 1, empty circle == 0
                    drawDot(((bits[i]) ? 'fillCircle' : 'drawCircle'));
                }
            }

            //Jump the y position down one col width (1 down on our grid)
            yPos += colWidth;
        }
    };

    //Convert the current time into a binary value array
    const data = dateTime().getCurrentTime().value.map(findBinary);

    //Loop through our time values and draw them into their columns
    for (let i = 0; i < data.length; i += 1) {
        drawColumn(i, data[i]);
    }

    //Keep a note of what we've drawn for a reduced draw on the next draw cycle
    prevFrame = data;

    //Show the date below our time
    drawDate();
};

let prevDate; // Used to stop redrawing the date if date has not changed
/**
 * Will output the date at the bottom of the screen only if
 *  - we're not showing the 'cheats' time (dec representation of time, e.g 13:02)
 *  - the current date is not the same as that stored in prevDate OR prevDate undefined
 */
const drawDate = () => {
    //If showing time, don't redraw date
    if (fullTimeDisplayTimout !== undefined) return;

    //If no date change, don't redraw
    let curDate = dateTime().getCurrentDate();
    if(prevDate == curDate.value) return;

    /**
     * Set the colour to a slightly darker colour before drawing the date
     * and then reset it when done
     */
    g.setColor(fontColor.darker);
    drawBottomMsg(curDate.toString());
    g.setColor(fontColor.regular);

    // Keep a hold of our date so we don't have to redraw on the next frame if we don't need to
    prevDate = curDate.value;
};

/**
 * Outputs passed string at the bottom of the display
 * @param {String} msg - our message to output
 */
const drawBottomMsg = (msg) => {
    const screenWidth = 240; // total avail screen width

    // Wipe out what's currently showing at the bottom
    g.clearRect(
        0,
        g.getHeight() - 60,
        screenWidth,
        screenWidth
    );

    //Set font alginment to centered and size it slighly larger than sys default
    g.setFontAlign(0, 0); // center font
    g.setFont("6x8", 2); // bitmap font, 8x magnified
    g.drawString(msg, g.getWidth() / 2, (g.getHeight() - 30));
};


/**
 * Keep an eye on btn1. If pushed show the 'cheats' time i.e (23:31)
 */
setWatch(() => {

    // If already showing time, exit early
    if (fullTimeDisplayTimout !== undefined) return;

    //Get the current time, returns an [h, h, m, m] array
    let curTime = dateTime().getCurrentTime().toString();

    // Use highlight font to display our time and reset it after
    g.setColor(fontColor.highlight);
    drawBottomMsg(curTime);
    g.setColor(fontColor.regular);

    /**
     * show time for a duration and then redraw the date
     */
    fullTimeDisplayTimout = setTimeout(() => {
        clearTimeout(fullTimeDisplayTimout);
        fullTimeDisplayTimout = undefined;

        prevDate = undefined; // setting to undefined forces redraw
        drawDate();

    }, 3000);

}, BTN1, { repeat: true });

/**
 * With a flick of the wrist, redraw our clock face.
 * Note: we need to refresh the widgets at the same time
 */
Bangle.on('lcdPower', on => {
    if (on) {
        Bangle.loadWidgets();
        Bangle.drawWidgets();
        drawClock();
    }
});



/**
 * Init
 * ----
 *
 * - Clear the screen
 * - Load the widgets and display them
 * - Setup our clock 'tick' timer
 * - Draw the clock face
 **/

// IMPORTANT: Make sure launcher is ALWAYS accessible on middle button press!!!
setWatch(Bangle.showLauncher, BTN2, { repeat: false, edge: "falling" });

g.clear();
Bangle.loadWidgets();
Bangle.drawWidgets();

setInterval(() => { drawClock(); }, 1000);
drawClock();
// Happy trails...