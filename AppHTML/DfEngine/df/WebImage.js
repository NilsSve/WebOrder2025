import { WebBaseControl } from './WebBaseControl.js';
import { df } from '../df.js';
/*
Class:
    df.WebImage
Extends:
    df.WebBaseControl

This is the client-side representation of the WebImage class. It renders the image (container) and 
can show images based on a URL or with base64 encoded data. It has support for different display 
modes like stretch and center and can show scrollbars.
    
Revision:
    2012/06/01  (HW, DAW) 
        Initial version.
*/
export class WebImage extends WebBaseControl {
    constructor(sName, oParent) {
        super(sName, oParent);

        this.prop(df.tString, "psUrl", "");
        this.prop(df.tBool, "pbScroll", false);
        this.prop(df.tInt, "pePosition", df.cwiActual);
        this.prop(df.tBool, "pbShowBorder", false);
        this.prop(df.tBool, "pbFitZoom", true);

        this.event("OnClick", df.cCallModeWait);
        this.pbServerOnClick = false;
        this.psClientOnClick = "";

        // @privates
        this._eImg = null;

        this._sLastUrl = null;

        this._iImageWidth = null;
        this._iImageHeight = null;


        this._bFocusAble = false;
        this._sControlClass = "WebImage";
    }

    /*
    This method augments the html generation and adds the div.WebImg_Wrp element and the img element.
    
    @param  aHtml   String builder array containing html.
    
    @private
    */
    openHtml(aHtml) {
        super.openHtml(aHtml);

        aHtml.push('<div class="WebImg_Wrp"><img>');
    }

    /*
    This method augments the html generation and closes the div.WebImg_Wrp element.
    
    @param  aHtml   String builder array containing html.
    
    @private
    */
    closeHtml(aHtml) {
        aHtml.push('</div>');

        super.closeHtml(aHtml);
    }

    /*
    This method is called after rendering and is used the get references to DOM elements, attach event 
    listeners and do other initialization.
    
    @private
    */
    afterRender() {
        this._eControl = df.dom.query(this._eElem, "div.WebImg_Wrp");
        this._eImg = df.dom.query(this._eElem, "div.WebImg_Wrp > img");

        super.afterRender();

        df.dom.on("click", this._eControl, this.onClick, this);
        df.dom.on("load", this._eImg, this.onImageLoaded, this);

        this.set_pePosition(this.pePosition);
        this.set_pbShowBorder(this.pbShowBorder);
        this.set_piHeight(this.piHeight);
        this.updateImage();
    }

    // - - - - - - Public API - - - - - -

    /*
    The setter of psUrl will update the image that is displayed. The updateImage method is called to 
    actually update the image. The _sUrl property is cleared to make sure that we are not showing base64 
    encoded images any more.
    
    @param  sVal    The new value.
    */
    set_psUrl(sVal) {
        this.psUrl = sVal;

        this.updateImage();
    }

    /*
    The setter of pbScroll enables or disabled the scrollbar. If pePosition is set to stretch it will not 
    enable the scrollbars and if pePosition is set to stretch horizontal it will only show the horizontal 
    scrollbar (if needed).
    
    @param  bVal    The new value.
    */
    set_pbScroll(bVal) {
        if (this._eControl) {
            this._eControl.style.overflowY = (bVal && this.pePosition !== df.cwiStretch ? "auto" : "hidden");
            this._eControl.style.overflowX = (bVal && this.pePosition !== df.cwiStretchHoriz && this.pePosition !== df.cwiStretch ? "auto" : "hidden");
        }
    }


    /*
    The mode determines how the image is positioned. It can be centered, stretched or left top aligned 
    (actual). This setter method changes this behavior by manipulating CSS properties of the image 
    element. The center image method is called to center the image (which is a calculated process) and 
    the setter of pbScroll is called because it depends on the mode as well.
    
    @param  iVal    New value.
    */
    set_pePosition(iVal) {
        if (this._eImg) {
            this._eControl.scrollLeft = 0;
            this._eControl.scrollTop = 0;

            this._eImg.style.width = (iVal === df.cwiStretch || iVal === df.cwiStretchHoriz ? "100%" : "");
            this._eImg.style.height = (iVal === df.cwiStretch ? "100%" : "");

            this._eImg.style.marginLeft = (iVal === df.cwiCenter ? "auto" : "");
            this._eImg.style.marginRight = (iVal === df.cwiCenter ? "auto" : "");
            this._eImg.style.display = "block";
            this._eImg.style.marginTop = "";


            this.pePosition = iVal;
            this.set_pbScroll(this.pbScroll);
            this.centerImage();
        }
    }

    /*
    This method determines if the image is shown with a border and background. It does this by removing 
    or adding the "WebImg_Box" CSS class.
    
    @param  bVal    The new value.
    */
    set_pbShowBorder(bVal) {
        if (this._eControl) {
            df.dom.toggleClass(this._eControl, "WebImg_Box", bVal);

            if (this.pbShowBorder !== bVal) {
                this.sizeChanged();
            }
        }
    }

    /*
    Sets the tooltip on the image element. Both the alt and the title attributes are set to make it show 
    as a tooltip in all browser.
    
    @param  sVal    The new tooltip.
    */
    set_psToolTip(sVal) {
        if (this._eImg) {
            this._eImg.alt = sVal;
            this._eImg.title = sVal;
        }
    }

    // - - - - - - Rendering - - - - - -

    /*
    This method is called by the server to update the displayed image with a base64 encoded image. The 
    image is passed in the ActionData as an array of strings. The parameter specifies the mime type.
    
    @param  sType   The mime type of the image.
    @client-action
    */
    // updateBase64 : function(sType){
    // var i, aStr = [], aData = this._aActionData;

    // if(aData.length > 0){
    // aStr.push("data:", sType, ";base64,");

    // for(i = 0; i < aData[0].aValues.length; i++){
    // aStr.push(aData[0].aValues[i]);
    // }

    // this._sUrl = aStr.join('');

    // this.updateImage();
    // }
    // }

    /*
    Updates the displayed image based on psUrl or _sUrl. If _sUrl is set it will use it.
    
    @private
    */
    updateImage() {
        this._iImageWidth = null;
        this._iImageHeight = null;

        if (this._eImg) {
            //  Because Chrome 36 doesn't fire the load URL after changing the src to the same URL we don't hide it in that case
            if (this.psUrl !== this._sLastUrl) {
                this._eImg.style.visibility = "hidden";
            }

            this._eImg.src = this.psUrl;
            this._sLastUrl = this.psUrl;

            this.centerImage();
        }
    }

    /*
    This method makes sure the image is centered if pePosition is set to cwiCenter. It does this by 
    setting the marginTop if the image is smaller in height than the available space or it sets the 
    scrollTop & scrollLeft if the image is bigger than the available space.
    
    @private
    */
    centerImage() {
        if (this._eImg) {
            //  For cwiFit we calculate the scale based on the image size and the control size
            if (this.pePosition === df.cwiFit) {
                if (this._iImageWidth > 0) {
                    const iHorizScale = this._eControl.clientWidth / this._iImageWidth;
                    const iVertScale = this._eControl.clientHeight / this._iImageHeight;

                    let iScale = (iHorizScale < iVertScale ? iHorizScale : iVertScale);
                    if (!this.pbFitZoom) {
                        iScale = (iScale > 1 ? 1 : iScale);
                    }

                    if (iScale > 0) {

                        this._eImg.style.width = Math.floor(this._iImageWidth * iScale) + "px";
                    }
                }
            }
            if (this.pePosition === df.cwiCenter || this.pePosition === df.cwiFit) {
                if (this._eImg.clientHeight < this._eControl.clientHeight) {
                    this._eImg.style.marginTop = Math.floor((this._eControl.clientHeight - this._eImg.clientHeight) / 2) + "px";
                } else {
                    this._eImg.style.marginTop = "";
                    this._eControl.scrollTop = Math.floor((this._eControl.scrollHeight - this._eControl.clientHeight) / 2);
                }
                if (this._eImg.clientWidth < this._eControl.clientWidth) {
                    this._eImg.style.marginLeft = Math.floor((this._eControl.clientWidth - this._eImg.clientWidth) / 2) + "px";
                } else {
                    this._eImg.style.marginLeft = "";
                    this._eControl.scrollLeft = Math.floor((this._eControl.scrollWidth - this._eControl.clientWidth) / 2);
                }

            }
        }
    }

    /*
    Overrides the resize method and calls the centerImage.
    
    @private
    */
    resize() {
        //  If the control was hidden during onImageLoaded we'll get the height now, if onImageLoaded didn't happen yet _iImageWidth should be null instead of 0
        if (this._iImageWidth === 0) {
            this._iImageWidth = this._eImg.clientWidth;
            this._iImageHeight = this._eImg.clientHeight;
        }
        this.centerImage();
    }

    /*
    Handles the onload event of the image element and centers this image.
    
    @private
    */
    onImageLoaded(oEvent) {
        this._iImageWidth = this._eImg.clientWidth;
        this._iImageHeight = this._eImg.clientHeight;

        this.centerImage();
        this._eImg.style.visibility = "";
    }

    onClick(oEvent) {
        if (this.isEnabled() && this.fire('OnClick')) {
            oEvent.stop();
        }
    }
}