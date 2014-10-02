var ISliderPrototype = Object.create(HTMLElement.prototype);
ISliderPrototype.createdCallback = function()
{
    var shadow = this.createShadowRoot();
    var line = document.createElement("div");
    var slider = document.createElement("div");
    var sliding = false;
    var pos = {x: 0, y: 0};
    var self = this;
    var mevent = null;
    
    if (typeof(this.getAttribute("min")) !== undefined)
        this.min = Number(this.getAttribute("min"));
    else
        this.min = 0;
        
    if (typeof(this.getAttribute("max")) !== undefined)
        this.max = Number(this.getAttribute("max"));
    else
        this.max = 1;
        
    Object.defineProperty(this, "value",{
        get: function() {
            return self._value;
        },
        set: function(v) {
            this._value = v;
            var p = (v-this.min)/(this.max-this.min)*(self.clientWidth-slider.clientWidth);
            p = Math.min(Math.max(p,0),self.clientWidth-slider.clientWidth);
            
            slider.style.left = p + "px";
        }
    });
    
    this._value = this.min;
    
    this.style.width = "120px";
    this.style.height = "1em";
    this.style.display = "inline-block";
    this.style.position = "relative";
    
    line.style.width = "100%";
    line.style.borderTop = "1px solid gray";
    line.style.top = "50%";
    line.style.position = "absolute";
    
    slider.style.position = "absolute";
    slider.style.width = "7px";
    slider.style.height = "100%";
    slider.style.background = "seagreen";
    slider.style.cursor = "ew-resize";
    
    this.addEventListener("mousedown",function(e) {
        sliding = true;
        slider.style.background = "darkgreen";
        pos = getPosition(self);
        self.style.cursor = "ew-resize";
        
        window.dispatchEvent(new MouseEvent("mousemove", e));
        
        mevent = window.addEventListener("mousemove",function(e) {
        var x = e.clientX;
        if (sliding)
        {
            var v = Math.max(Math.min(x-pos.x-slider.clientWidth/2,self.clientWidth-slider.clientWidth),0);
            var p = self.min;
            p += (v / (self.clientWidth-slider.clientWidth)) * (self.max - self.min);
            var event = new Event("change");
            self._value = p;
            self.dispatchEvent(event);
            slider.style.left = (v) + "px";
        }
        });
    });
    
    
    
    window.addEventListener("mouseup",function() {
        sliding = false;
        slider.style.background = "seagreen";
        self.style.cursor = "auto";
        window.removeEventListener(mevent);
    });
    
    
    shadow.appendChild(line);
    shadow.appendChild(slider);
};

var ISlider = document.registerElement("input-slider", { prototype: ISliderPrototype } );

function getPosition(element) {
    var xPosition = 0;
    var yPosition = 0;
  
    while(element) {
        xPosition += (element.offsetLeft - element.scrollLeft + element.clientLeft);
        yPosition += (element.offsetTop - element.scrollTop + element.clientTop);
        element = element.offsetParent;
    }
    return { x: xPosition, y: yPosition };
}