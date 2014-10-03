var scene = new THREE.Scene();
var camera =  new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight, 0.1, 1000);

var renderer;
var t;
var gi;
var rot = 0;
var settings;
var ghost;

function init()
{
	settings = new Settings();
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth,window.innerHeight);
	document.getElementById("canvas").appendChild(renderer.domElement);
	
	var light = new THREE.DirectionalLight( 0xfffff0, 1);
	light.position.set(1,1,1);
	scene.add(light);
	
	var ambientLight = new THREE.AmbientLight(0x606060);
	scene.add(ambientLight);
	
	ghost = new Ghost();
	
	initTree();
	
	camera.position.z = 2.5;
	camera.position.y = 1;
	render();
}

function initTree()
{
	if (t != null)
		t.remove();
	t = new Tree();
	t.createCloud(new THREE.Vector3(settings.cloudx.value,settings.cloudy.value,settings.cloudz.value),new THREE.Vector3(settings.cloudsx.value,settings.cloudsy.value,settings.cloudsz.value),settings.cloud.value);
	t.generateStem(1);
	
	if (gi != null)
		clearInterval(gi);
	
	gi = setInterval(grow,10);
}

function Settings()
{
	var self = this;
	this.cloud = document.getElementById("clouddensity");
	var cloudn = document.getElementById("clouddensitynumber");
	cloudn.addEventListener("input",function() { self.cloud.value = cloudn.value; });
	this.cloud.addEventListener("change",function() { cloudn.value = self.cloud.value; });
	this.cloud.value = 1000;
	cloudn.value = this.cloud.value;
	
	document.getElementById("ghost").addEventListener("change",function() {
		if (document.getElementById("ghost").checked)
			ghost.add();
		else
			ghost.remove();
	});
	
	this.cloudsx = document.getElementById("cloudscalex");
	this.cloudsx.value = 3;
	this.cloudsy = document.getElementById("cloudscaley");
	this.cloudsy.value = 1;
	this.cloudsz = document.getElementById("cloudscalez");
	this.cloudsz.value = 3;
	
	this.cloudx = document.getElementById("cloudx");
	this.cloudx.value = -0.8;
	this.cloudy = document.getElementById("cloudy");
	this.cloudy.value = 1.3;
	this.cloudz = document.getElementById("cloudz");
	this.cloudz.value = 0;
}
Settings.prototype.save = function()
{
	var c = document.getElementById("copy");
	c.value = this.cloud.value.toString(16)
		+ ":" + this.cloudsx.value.toString(16)
		+ ":" + this.cloudsy.value.toString(16)
		+ ":" + this.cloudsz.value.toString(16)
		+ ":" + this.cloudx.value.toString(16)
		+ ":" + this.cloudy.value.toString(16)
		+ ":" + this.cloudz.value.toString(16);
}
Settings.prototype.load = function()
{
	var c = document.getElementById("paste");
	var v = c.value.split(":");
	this.cloud.value = parseInt(v[0],16);
	this.cloudsx.value = parseInt(v[1],16);
	this.cloudsy.value = parseInt(v[2],16);
	this.cloudsz.value = parseInt(v[3],16);
	this.cloudx.value = parseInt(v[4],16);
	this.cloudy.value = parseInt(v[5],16);
	this.cloudz.value = parseInt(v[6],16);
	
	ghost.update();
}

function copy()
{
	settings.save();
}

function Ghost()
{
	var self = this;
	this.cloud = new THREE.Mesh(new THREE.SphereGeometry(0.5,16,12), new THREE.MeshLambertMaterial({color: 0x00ff00,wireframe: true}));
	settings.cloudsx.addEventListener("change", function() { self.cloud.scale.x = settings.cloudsx.value; });
	settings.cloudsy.addEventListener("change", function() { self.cloud.scale.y = settings.cloudsy.value; });
	settings.cloudsz.addEventListener("change", function() { self.cloud.scale.z = settings.cloudsz.value; });
	settings.cloudx.addEventListener("change", function() { self.cloud.position.x = settings.cloudx.value; });
	settings.cloudy.addEventListener("change", function() { self.cloud.position.y = settings.cloudy.value; });
	settings.cloudz.addEventListener("change", function() { self.cloud.position.z = settings.cloudz.value; });
	this.update();
}
Ghost.prototype.add = function()
{
	scene.add(this.cloud);
};
Ghost.prototype.remove = function()
{
	scene.remove(this.cloud);
};
Ghost.prototype.update = function()
{
	this.cloud.scale.x = settings.cloudsx.value;
	this.cloud.scale.y = settings.cloudsy.value;
	this.cloud.scale.z = settings.cloudsz.value;
	this.cloud.position.x = settings.cloudx.value;
	this.cloud.position.y = settings.cloudy.value;
	this.cloud.position.z = settings.cloudz.value;
};

function grow()
{
	if (!t.grow(0.1,0.3))
	{
		clearInterval(gi);
		t.buildMesh();
		t.buildLeaves();
	}
	else
	{
		t.addToScene();
	}
}

function render()
{
	requestAnimationFrame(render);
	rot += 0.005;
	/*
	if (t.branchLines != null)
		t.branchLines.rotation.y = rot;
	if (t.mesh != null)
		t.mesh.rotation.y = rot;
	if (t.leavesMesh != null)
		t.leavesMesh.rotation.y = rot;
	*/
	camera.position.x = Math.cos(rot) * 2.5;
	camera.position.z = Math.sin(rot) * 2.5;
	camera.lookAt(new THREE.Vector3(0,1,0));
	renderer.render(scene,camera);
}

function Tree()
{
	this.cloud = [];
	this.branches = [];
	this.pointCloud;
	this.branchLines;
	this.branchVertices;
	this.branchGeometry;
	this.leavesMesh;
	
	this.complexGeometry;
	
	this.segmentSize = 0.08;
	this.thicknessMultiplier = 0.0017;
	this.maxThickness = 0.2;
	this.maxChildren = 2;
	this.count = 0;
	
	this.mesh;
	this.oldestAge = 0;
	
	this.createCloud = function(position,size,count)
	{
		for (var i = 0; i<count; i++)
		{
			var pos;
			do
			{
				pos = new THREE.Vector3((Math.random()-0.5),(Math.random()-0.5),(Math.random()-0.5));
			}
			while (pos.length() > 0.5)
			pos.multiply(size);
			pos.add(position);
			this.cloud.push(pos);
		}
	};
	
	this.generateStem = function(length)
	{
		segments = length/this.segmentSize;
		var ppos = new THREE.Vector3(0,0,0);
		var l = 0;
		for (var i = 0; i<segments; i++)
		{
			var r = Math.random()*0.4 + 0.6;
			var direction = new THREE.Vector3(Math.sin(Math.PI/4*r - Math.PI/2/segments*i),Math.cos(Math.PI/4*r - Math.PI/2/segments*i),0);
			direction.normalize();
			direction.multiplyScalar(this.segmentSize);
			var pos = ppos;
			pos.add(direction);
			ppos = pos.clone();
			this.branches.push(new Tree.Segment( pos));
			this.branches[i].growDirection = direction;
			this.branches[i].age = segments-i;
			this.branches[i].ignore = true;
			if (i!=0)
				this.branches[i].parent = this.branches[i-1];
			l = i;
		}
		this.branches[l].ignore = false;
	};
	
	/* INCOMPLETE BELOW. READ ON http://www.jgallant.com/procedurally-generating-trees-with-space-colonization-algorithm-in-xna/ */
	
	this.grow = function(minDistance,maxDistance)
	{
		var again = false;
		for (var i = this.cloud.length-1; i>0; i--)
		{
			if (this.cloud[i] == null) continue;
			var point = this.cloud[i], skip = true;
			var closestBranch = null, closestDistance = maxDistance;
			for (var j = 0; j<this.branches.length; j++)
			{
				var branch = this.branches[j];
				var dist = point.distanceTo(branch.pos);
				if (dist > maxDistance || branch.ignore == true)
				{
					continue;
				}
				if (dist <= minDistance)
				{
					skip = true;
					this.cloud[i] = null;
					break;
				}
				if (closestDistance > dist)
				{
					closestDistance = dist;
					closestBranch = branch;
					skip = false;
				}
			}
			if (skip) continue;
			if (closestBranch == null) {continue; this.cloud.pop()};
			
			closestBranch.growCount++;
			var p = new THREE.Vector3(point.x,point.y,point.z);
			p.sub(closestBranch.pos);
			p.normalize();
			closestBranch.growDirection.add(p);
		}
		
		for (var i = this.branches.length - 1; i>0; i--)
		{
			var branch = this.branches[i];
			if (branch.growCount > 0)
			{
				branch.growDirection.normalize();
				var pos = branch.growDirection.clone();
				pos.multiplyScalar(this.segmentSize);
				pos.add(branch.pos);
				
				var b = new Tree.Segment(pos,branch);
				b.growDirection = branch.growDirection.clone();
				branch.growCount = 0;
				//branch.growDirection = new THREE.Vector3(0,0,0);
				this.branches.push(b);
				
				again = true;
				branch.grew++;
				branch.children++;
				if (branch.children > this.maxChildren) {branch.ignore = true; }
			}
			if (branch.grew>0)
			{
				branch.age++;
				branch.parent.grew++;
				if (this.oldestAge < branch.age)
					this.oldestAge = branch.age;
			}
			
			branch.grew = 0;
			
		}
		/*
		var c = [];
		var ci = 0;
		for (var i = 0; i<this.cloud.length; i++)
		{
			if (this.cloud[i] != null)
			{
				c[ci] = this.cloud[i];
				ci++;
			}
		}
		this.cloud = c;
		*/
		return again;
		//READY TO LOOP AGAIN.
	};
	
	this.addToScene = function()
	{
		
		if  (this.branchVertices == null || true)
		{
			//scene.remove(this.pointCloud);
			
			//var geometry = new THREE.Geometry();
			//geometry.vertices = this.cloud;
			//this.pointCloud = new THREE.PointCloud(geometry, new THREE.PointCloudMaterial({color: 0x00ff00, size: 0.05}));
			scene.remove(this.branchLines);
			
			this.branchVertices = [];
			for (var i = 1; i<this.branches.length; i++)
			{
				this.branchVertices.push(this.branches[i].parent.pos);
				this.branchVertices.push(this.branches[i].pos);
			}
			this.branchGeometry = new THREE.Geometry();
			this.branchGeometry.vertices = this.branchVertices;
			this.branchLines = new THREE.Line(this.branchGeometry, new THREE.LineBasicMaterial({color: 0xaa6611, linewidth: 3}),THREE.LinePieces);
			
			
			this.count = this.branches.length;
			scene.add(this.branchLines);
			//scene.add(this.pointCloud);
		}
		else
		{
			for (var i = this.count-1; i<this.branches.length; i++)
			{
				this.branchVertices.push(this.branches[i].parent.pos);
				this.branchVertices.push(this.branches[i].pos);
			}
			
			this.branchGeometry.verticesNeedUpdate = true;
		}
	};
	
	this.buildMesh = function()
	{
		var geometry = new THREE.Geometry();
		
		for (var i = 1; i<this.branches.length; i++)
		{
			var b = this.branches[i];
			var g = new THREE.CylinderGeometry(Math.min(b.age*this.thicknessMultiplier,this.maxThickness),Math.min(b.parent.age*this.thicknessMultiplier,this.maxThickness),this.segmentSize,8,1,true);
			g.applyMatrix( new THREE.Matrix4().makeTranslation( 0, this.segmentSize / 2, 0 ) );
			g.applyMatrix( new THREE.Matrix4().makeRotationX( Math.PI / 2 ) );
			var m = new THREE.Mesh(g, new THREE.MeshNormalMaterial());
			m.position.y = b.parent.pos.y;
			m.position.x = b.parent.pos.x;
			m.position.z = b.parent.pos.z;
			m.up = new THREE.Vector3(1,0,0);
			m.lookAt(b.pos);
			
			THREE.GeometryUtils.merge(geometry,m);
		}
		
		geometry.mergeVertices();
		this.mesh = new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({ color: 0xffffff, map: THREE.ImageUtils.loadTexture("images/bark.png")}));
		scene.remove(this.branchLines);
		scene.remove(this.pointCloud);
		scene.add(this.mesh);
	};
	
	this.buildLeaves = function()
	{
		var geometry = new THREE.Geometry();
		
		var mat = new THREE.MeshLambertMaterial( {
			color: 0xffaaaa,
			map: THREE.ImageUtils.loadTexture("images/leaf.png"),
			alphaMap: THREE.ImageUtils.loadTexture("images/leafmask.png"),
			transparent: true,
			side: THREE.DoubleSide,
			alphaTest: 0.6
		});
		
		for (var i = 0; i < this.branches.length; i++)
		{
			var b = this.branches[i];
			var r = Math.random();
			if (r < (1/b.age)*(1/b.age)*10 && !b.ignore)
			{
				var c = Math.random()*20;
				for (var j = 0; j < c; j++)
				{
					var g = new THREE.PlaneGeometry(0.1,0.1);
					g.applyMatrix(new THREE.Matrix4().makeTranslation(0.1,0,0));
					g.applyMatrix(new THREE.Matrix4().makeRotationX( Math.random()*Math.PI*2));
					g.applyMatrix(new THREE.Matrix4().makeRotationY( Math.random()*Math.PI*2));
					g.applyMatrix(new THREE.Matrix4().makeRotationZ( Math.random()*Math.PI*2));
					
					geometry.merge(g,new THREE.Matrix4().makeTranslation( b.pos.x,b.pos.y,b.pos.z),0);
				}
			}
		}
		
		this.leavesMesh = new THREE.Mesh(geometry, mat);
		scene.add(this.leavesMesh);
	}
	
	this.remove = function()
	{
		scene.remove(this.leavesMesh);
		scene.remove(this.branchLines);
		scene.remove(this.mesh);
	};
}

Tree.Segment = function(pos,parent){
	this.pos = pos;
	this.parent = parent;
	this.growCount = 0;
	this.age = 0;
	this.grew = 0;
	this.ignore = false;
	this.growDirection = new THREE.Vector3(0,0,0);
	this.children = 0;
};

document.onreadystatechange = function () {
  if (document.readyState == "complete") {
    init();
  }
}