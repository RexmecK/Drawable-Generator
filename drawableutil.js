function stringToHex(c)
{
	var hex = c.toString(16);
	return hex.length == 1 ? "0" + hex : hex;
}

function shortableHex(v)
{
	for(var i=0;i<16;i++)
	{
		if(v == i * 17)
		{
			return true;
		}
	}
	return false;
}

function shortableRGBA(rgba) //rgba can be rgb array
{
	for(i = 0; i < rgba.length; i++)
	{
		if(!shortableHex(rgba[i]))
		{
			return false
		}	
	}
	return true
}

function nullifyrgba(rgba)
{
    if(rgba.length > 3 && rgba[3] <= 0)
        return [0,0,0,0]
    return rgba
}

function rgbaToHex(r, g, b, a)
{
	let rgba = [
		Math.min(r, 255),
		Math.min(g, 255),
		Math.min(b, 255),
		Math.min(a, 255)
	]
	if((a == null) || (a == 255))
		rgba.pop()
	
	let hex = ""
	if(shortableRGBA(rgba))
	{
		for(i = 0; i < rgba.length; i++)
		{
			hex += stringToHex(rgba[i]).substring(0, 1);
		}
	}
	else
	{
		for(i = 0; i < rgba.length; i++)
		{
			hex += stringToHex(rgba[i]);
		}
	}
	return hex
}


function preShortenColor(c)
{
	return [
		Math.round(c[0] / 17) * 17,
		Math.round(c[1] / 17) * 17,
		Math.round(c[2] / 17) * 17,
		Math.round(c[3] / 17) * 17,
	]
}



//palettes color counter
//returns palettes = {};
function palettesCount(image)
{
	let img = document.createElement('canvas');
	img.width = image.width;
	img.height = image.height;
	let context2d = img.getContext('2d');
	context2d.drawImage(image, 0,0);
	let palettes = {}
	for (x = 0; x < img.width; x++)
	{
		for (y = 0; y < img.height; y++)
		{
			let colorData = context2d.getImageData(x, y, 1, 1).data;
			let hex = rgbaToHex(colorData[0], colorData[1], colorData[2], colorData[3]);
			palettes[hex] = (palettes[hex] != null ? palettes[hex] : 0) + 1;
		}
	}
	return palettes;
}

//creates temporary colors 
//returns replaces = {};
function palettesSubstitutes(palettes, greenIndex, replaceTransparents)
{
	let replaces = {};
	let Index = [0, 0, 0, 15];
	let greenIndex2 = greenIndex ? greenIndex : 0;
	let greenIndexMin = Math.ceil(greenIndex2 / 17) + 1;
	let stop = false;
	if(greenIndex2 < 119)
	{
		Index[1] = greenIndexMin;
	}
	function incrementIndex()
	{
		Index[0] += 1;
		if(Index[0] > 15)
		{
			Index[0] = 0;
			Index[1] += 1;
		}
		if(Index[1] > 15)
		{
			Index[1] = greenIndexMin;
			Index[2] += 1;
		}
		if(Index[2] > 15)
		{
			Index[2] = 0;
			Index[3] -= 1;
		}
		if(Index[3] < 0)
		{
			stop = true
		}
	}
	for(var color in palettes)
	{
		if((color.length > 4 || ((color[3] == 0) && replaceTransparents)) && palettes[color] > 3) // || color[3] == 0
		{
			replaces[color] = rgbaToHex(Index[0]*17,Index[1]*17,Index[2]*17,Index[3]*17);
			incrementIndex();
			if(stop){break}
			//skip existing palettes
			while(palettes[rgbaToHex(Index[0]*17,Index[1]*17,Index[2]*17,Index[3]*17)])
			{
				incrementIndex();
				if(stop){break}
			}
		}
	}
	return replaces;
}

//replaces temporary colors with real colors
//returns a string directives
function palettesSubstitutesToOriginal(replaces)
{
	let directives = "?replace"
	for(var color in replaces)
	{
		directives += ";" + replaces[color] + "=" + color;
	}
	if(directives == "?replace")
	{
		return "";
	}
	return directives;
}

let types = {}

types.fade = function(image, options)
{
	options = options ? options : {};
	let img = document.createElement('canvas');
	img.width = options.width ? options.width : image.width;
	img.height = options.height ? options.height : image.height;
	
	context2d = img.getContext('2d');
	context2d.drawImage(image, -(options.offset ? options.offset[0] : 0), -(options.offset ? options.offset[1] : 0));
	let srcImageDirectory = options.imagePath ? options.imagePath : "/assetmissing.png";
	//green index validation
	let greenIndex = Math.min(Math.max(parseInt(options.greenIndex, 16), 0), 255);
	if(isNaN(greenIndex))
	{
		greenIndex = 0;
	}
	let baseDirectives = "?crop;0;0;1;1?setcolor=fff?replace;fff0=fff?border=1;fff;000?scale=1.15;1.12?crop;1;1;3;3"
	
	//setup recipes for scaling
	baseDirectives +=
		"?replace" +
		";fbfbfb=" + rgbaToHex(0, greenIndex, 0,0) +
		";eaeaea=" + rgbaToHex(img.width, greenIndex, 0,0) +
		";e4e4e4=" + rgbaToHex(0, greenIndex, img.height, 0) +
		";6a6a6a=" + rgbaToHex(img.width, greenIndex, img.height, 0);
	//scale to make the drawable map
	baseDirectives += "?scale=" + (img.width - 0.5);
	if(img.width != img.height)
	{
		baseDirectives += ";" + (img.height - 0.5);
	}
	//crop left overs from scale borders
	let crop = [
		0,0,
		img.width, img.height
	]
	//it fixes 256x256 drawable
	if(img.width > 255)
	{
		crop[0] += 1;
		crop[2] += 1;
	}
	if(img.height > 255)
	{
		crop[1] += 1;
		crop[3] += 1;
	}
	
	baseDirectives += "?crop=" + crop.join(";");

	//palettes substitute replace longer with a shorter one temporarily
	let toReplace = {};
	if(!options.compressColor && !options.disablePalettesSubstitutes)
	{
		toReplace = palettesSubstitutes(palettesCount(image), greenIndex, options.retainColorValue);
	}
    toOriginal = palettesSubstitutesToOriginal(toReplace);
	//pixeldata
	let pixelData = "?replace"
	for(let x = 0; x < img.width; x++)
	{
		for(let y = 0; y < img.height; y++)
		{
			let color = context2d.getImageData(x, img.height - y - 1, 1, 1).data;
            
            if (!options.retainColorValue)
            {
                color = nullifyrgba(color);
            }

			if (color[3] > 0 || options.retainColorValue)
			{
				if (options.compressColor)
				{
					color = preShortenColor(color)
				}

				let colorHex = rgbaToHex(color[0], color[1], color[2], color[3]);
				pixelData +=  ";" 
				+ rgbaToHex(x, greenIndex, y, 0) 
				+ "=" 
				+ (toReplace[colorHex] != null ? toReplace[colorHex] : colorHex); //use palettes substitutes or original color
			}
		}
	}
	//output
	if(options.pixelMapOnly)
	{
		srcImageDirectory = "";
		baseDirectives = "";
	}
	if(pixelData == "?replace")
	{
		return srcImageDirectory;
	}
	return srcImageDirectory + baseDirectives + pixelData + toOriginal;
}

types.legacy = function(image, options)
{
	let img = document.createElement('canvas');
	img.width = image.width;
	img.height = image.height;
	context2d = img.getContext('2d');
	context2d.drawImage(image, 0, 0, image.width, image.height);
	
	options = options ? options : {};
	let srcImageDirectory = options.imagePath ? options.imagePath : "/assetmissing.png";
	let signSize = options.signSize ? options.signSize : [32, 8];
	let signDirectory = options.signDirectory ? options.signDirectory : "/objects/outpost/customsign/signplaceholder.png";

    //prepares sign index
	let signColors = [["00000000"]];
	for(let x=1;x<=signSize[0];x++)
	{
		signColors[x] = [];
		for(let y=1;y<=signSize[1];y++)
		{
			let xx = (x+"");
			let yy = (x+"");
			if(x<10)
				xx = "0"+x;
			if(y<10)
				yy = "0"+y;
			signColors[x-1][y-1] = xx + "00" + yy + "00"
		}
	}

	//directives init
	let directives = "?crop=;0;0;1;1?setcolor=fff?replace;fff=ffffff02;fff0=ffffff02?scalenearest=" + image.width + ";" + image.height;
	
	//calculates how much signs to be placed x and y
	let signs = [
		Math.ceil(image.width / signSize[0]),
		Math.ceil(image.height / signSize[1]),
	]

	//palettes tags
	let toReplace = {};
	if(!options.compressColor && !options.disablePalettesSubstitutes)
	{
		toReplace = palettesSubstitutes(palettesCount(image), 0, options.retainColorValue);
	}

	//iterate sign blocks
	for(let sy = 0; sy < signs[1];sy++)
	{
		for(let sx = 0; sx < signs[0];sx++)
		{
			//gets sign position in the image
			let spos = [sx * signSize[0], sy * signSize[1]];

			//new sign
			let sign = "?blendmult=" + signDirectory + ";" + (-sx * signSize[0]) + ";" + -(sy * signSize[1]);
			let palettes = "?replace";
			let hasColor = false;
			
			//iterate pixels + sign blocks
			for(let x=0; x<signSize[0];x++)
			{
				for(let y=0; y<signSize[1];y++)
				{
					if (image.height > (spos[1] + y) && image.width > (spos[0] + x))
					{
						//get pixel from pos
						let colorData = context2d.getImageData(spos[0] + x, image.height - (spos[1] + y + 1) , 1, 1).data;

                        if (!options.retainColorValue)
                        {
                            colorData = nullifyrgba(colorData);
                        }

						if(colorData[3] > 0)
						{
							hasColor = true;
						}

						if (options.compressColor)
						{
							colorData = preShortenColor(colorData)
						}
                        
						//apply pixel
						if(sx + 1==signs[0] && sy + 1==signs[1] && colorData[3] == 0 && options.bypassTransparentLastSign){
							//let colorHex = rgbaToHex(colorData[0],colorData[1],colorData[2],colorData[3]);
							//palettes += ";" + signColors[x][y] + "=" + (toReplace[colorHex] != null ? toReplace[colorHex] : colorHex);
						}
						else
						{
							let colorHex = rgbaToHex(colorData[0],colorData[1],colorData[2],colorData[3]);
							palettes += ";" + signColors[x][y] + "=" + (toReplace[colorHex] != null ? toReplace[colorHex] : colorHex);
						}
					}
				}
			}
			if (hasColor && (palettes != "?replace"))
			{
				directives += sign + palettes;
			}
		}
	}
	
	//final processing
	return srcImageDirectory + directives + palettesSubstitutesToOriginal(toReplace);
}

types.signmap = function(image, options)
{
	let img = document.createElement('canvas');
	img.width = image.width;
	img.height = image.height;
	context2d = img.getContext('2d');
	context2d.drawImage(image, 0, 0, image.width, image.height);
	let srcImageDirectory = options.imagePath ? options.imagePath : "/assetmissing.png";
	let signSize = options.signSize ? options.signSize : [32, 8];
	let signDirectory = options.signDirectory ? options.signDirectory : "/objects/outpost/customsign/signplaceholder.png";

    let directives = ""
    directives += "?crop=;0;0;1;1?setcolor=fff?replace;fff=fff0"
    directives += "?scalenearest=" + image.width + ";" + image.height;

    // signmapped = { "pos":[0,0], "palettes":[{"pos":[0,0], "color": "000"}] }
    let signmap = [];

    
	let toReplace = {};
	if(!options.compressColor && !options.disablePalettesSubstitutes)
	{
		toReplace = palettesSubstitutes(palettesCount(image), 0, options.retainColorValue);
	}

	let signs = [
		Math.ceil(image.width / signSize[0]),
		Math.ceil(image.height / signSize[1]),
	]

	for(let sy = 0; sy < signs[1];sy++)
	{
		for(let sx = 0; sx < signs[0];sx++)
		{
			//gets sign position in the image
			let spos = [sx * signSize[0], sy * signSize[1]];

			//new sign
            //{"pos":[0,0], "color": "000"}
			let palettes = [];
			let hasColor = false;
			
			//iterate pixels + sign blocks
			for(let x=0; x<signSize[0];x++)
			{
				for(let y=0; y<signSize[1];y++)
				{
					if (image.height > (spos[1] + y) && image.width > (spos[0] + x))
					{
						//get pixel from pos
						let colorData = context2d.getImageData(spos[0] + x, image.height - (spos[1] + y + 1) , 1, 1).data;

                        if (!options.retainColorValue)
                        {
                            colorData = nullifyrgba(colorData);
                        }

						if(colorData[3] > 0)
						{
							hasColor = true;
						}

						if (options.compressColor)
						{
							colorData = preShortenColor(colorData)
						}
                        
						//apply pixel
						if(colorData[3] > 0 || options.retainColorValue){
							let colorHex = rgbaToHex(colorData[0],colorData[1],colorData[2],colorData[3]);
							palettes.push(
                                {
                                    pos: [x + 1,y + 1],
                                    color: (toReplace[colorHex] != null ? toReplace[colorHex] : colorHex),
                                }
                            )
						}
					}
				}
			}
			if (hasColor && (palettes.length > 0))
			{
                signmap.push(
                    {
                        pos: [-sx * signSize[0], -sy * signSize[1]], 
                        palettes: palettes
                    }
                )
			}
		}
	}

    //build map
	for(let i = 0; i < signmap.length; i++)
    {
        let sign = signmap[i];
        directives += "?blendmult=/objects/outpost/customsign/signplaceholder.png;" + sign.pos[0] + ";" + sign.pos[1] + "?scanlines=0a0;0.001;0a0;0.001";
    }

    //build replaces
    let replaceDirectives = "?replace"
	for(let i = 0; i < signmap.length; i++)
    {
        let sign = signmap[i];
        let greenindex = signmap.length - i;
	    for(let c = 0; c < sign.palettes.length; c++)
        {
            let palette = sign.palettes[c]

            let x = palette.pos[0]
            let g = greenindex
            let y = palette.pos[1]
			let xx = (x+"");
			let yy = (y+"");
			if(x<10)
				xx = "0"+x;
			if(y<10)
				yy = "0"+y;
			let signColor = xx + stringToHex(greenindex) + yy + "00";

            replaceDirectives += ";" + signColor + "=" + palette.color;
        }
    }
    if(replaceDirectives != "?replace")
    {
        directives += replaceDirectives;
    }

	return srcImageDirectory + directives + palettesSubstitutesToOriginal(toReplace);
}

function generateDrawableFromImage(type, image, options)
{
    if (types[type])
    {
        return types[type](image, options)
    }
}