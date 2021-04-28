include("drawableutil.js");

var outputText = document.getElementById("output");
var generatingtext = document.getElementById("generating");

function generate(){
	let files = document.getElementById("input").files
	if (files.length == 1) {
		readfile(files[0])
	}
	else
	{
		generatingtext.style.display = "none";
	}
}

function readfile(file)
{
	outputText.value = "";
	generatingtext.style.display = "initial";
	generatingtext.innerHTML = "Generating...";
	let reader = new FileReader();
	let options = {
		pixelMapOnly: document.getElementById("pixelMapOnlyCheckBox").checked,
		imagePath: document.getElementById("imagePathTextBox").value,
		compressColor: document.getElementById("compressColorCheckBox").checked,
		greenIndex: document.getElementById("greenIndexTextBox").value,
		retainColorValue: document.getElementById("RetainColorValue").checked,
		bypassTransparentLastSign: document.getElementById("bypassTransparentLastSign").checked,
		disablePalettesSubstitutes: document.getElementById("disablePalettesSubstitutes").checked
	}

	reader.onload = function(a)
	{
		let img = new Image;
		img.onload = function(){
			let output = "";
			if(img.height <= 256 && img.width <= 256 && !document.getElementById("checkboxlegacy").checked){
				generatingtext.innerHTML = "Generated!";
				output = generateDrawableFromImage(
					"fade",
					img,
					options
				);
			}
			else
			{
				generatingtext.innerHTML = "Generated (legacy)!";
				output = generateDrawableFromImage(
					"legacy",
					img,
					options
				);
			}
			outputText.value = output;
			if (document.getElementById("copytoclipboard").checked)
			{
				outputText.select();
				outputText.setSelectionRange(0, output.length);
				document.execCommand("copy");
			}
		};

		img.onerror = function(a) {
			generatingtext.innerHTML = "Unable to generate (Error loading Image)";
		}

		img.src = a.target.result;
	}

	reader.onerror = function(a) {
		generatingtext.innerHTML = "Unable to generate (Unknown file)";
	}


	reader.readAsDataURL(file);
}

//drag and drop stuff

var lastTarget = null;

var drop = document.getElementById("drop");
window.addEventListener("dragenter", function(e)
	{
		lastTarget = e.target;
		drop.style.visibility = "";
		drop.style.opacity = 1;
	}
);
window.addEventListener("dragover", function(e)
	{
		e.dataTransfer.dropEffect = 'copy';
		e.preventDefault();
	}
);
window.addEventListener("dragleave", function(e)
	{
		if(e.target === lastTarget || e.target === document)
		{
		 	drop.style.visibility = "hidden";
		 	drop.style.opacity = 0;
		}
	}
);
drop.addEventListener("drop", function(e)
	{
		if (e.preventDefault)
			e.preventDefault();
		
		if(e.dataTransfer.files.length == 1)
			readfile(e.dataTransfer.files[0]);
		
		drop.style.visibility = "hidden";
		drop.style.opacity = 0;
	}
);

//visuals
var lastColor = [Math.random() * 255, 0, 10];
var targetColor = [Math.random() * 255, 0, 10];

function arrayhsl(a)
{
	return "hsl("+a[0]+","+a[1]+"%,"+a[2]+"%)"
}

function tick2()
{
	let newtargetColor = [Math.random() * 255, 25, 44];
	document.body.style.background = "linear-gradient(90deg, " + arrayhsl(lastColor) + ", " + arrayhsl(targetColor) + ", " + arrayhsl(newtargetColor) + ")";
	document.body.style["background-size"] = "200% 200%";
	document.body.style.animation = 'none';
	document.body.offsetHeight;
	document.body.style.animation = null; 
	document.body.style.animation = "gradient 3s linear 1 forwards";

	lastColor = targetColor;
	targetColor = newtargetColor;

}
tick2();
setInterval(tick2,3000);