var scene = new THREE.Scene();
var camera =  new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight, 0.1, 1000);

var renderer;
var t;
var gi;
var  rot = 0;

function init()
{
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth,window.innerHeight);
	document.getElementById("canvas").appendChild(renderer.domElement);

	//var line = new THREE.Line(createTree(),new THREE.LineBasicMaterial({color: 0x99ff33}),THREE.LinePieces);
	//scene.add( line );
	
	t = new Tree();
	t.createCloud(new THREE.Vector3(0,2,0),new THREE.Vector3(4,2,4),1000);
	t.generateStem(1);
	
	gi = setInterval(grow,100);
	
	camera.position.z = 5;
	camera.position.y = 2;
	render();
}

function grow()
{
	if (!t.grow(0.1,0.5))
		clearInterval(gi);
	
	t.addToScene();
}

function render()
{
	requestAnimationFrame(render);
	rot += 0.01;
	t.branchLines.rotation.y = rot;
	
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
	
	this.segmentSize = 0.05;
	
	this.count = 0;
	
	this.createCloud = function(position,size,count)
	{
		for (var i = 0; i<count; i++)
		{
			var pos;
			do
			{
				pos = new THREE.Vector3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5);
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
		for (var i = 0; i<segments; i++)
		{
			this.branches.push(new Tree.Segment(new THREE.Vector3(0,i*this.segmentSize,0)));
			this.branches[i].growDirection = new THREE.Vector3(0,1,0);
			if (i!=0)
				this.branches[i].parent = this.branches[i-1];
		}
	};
	
	/* INCOMPLETE BELOW. READ ON http://www.jgallant.com/procedurally-generating-trees-with-space-colonization-algorithm-in-xna/ */
	
	this.grow = function(minDistance,maxDistance)
	{
		var again = false;
		for (var i = this.cloud.length-1; i>0; i--)
		{
			var point = this.cloud[i], skip = false;
			var closestBranch = null, closestDistance = maxDistance;
			for (var j = 0; j<this.branches.length; j++)
			{
				var branch = this.branches[j];
				var dist = point.distanceTo(branch.pos);
				if (dist > maxDistance)
					continue;
				if (dist < minDistance)
				{
					skip = true;
					this.cloud.pop();
					break;
				}
				if (closestDistance > dist)
				{
					closestDistance = dist;
					closestBranch = branch;
				}
			}
			if (skip) continue;
			if (closestBranch == null) continue;
			closestBranch.growCount++;
			var p = point.clone();
			p.sub(closestBranch.pos);
			p.normalize();
			closestBranch.growDirection.add(p);
		}
		
		for (var i = 0; i<this.branches.length; i++)
		{
			var branch = this.branches[i];
			if (branch.growCount > 0)
			{
				branch.growDirection.divideScalar(branch.growCount);
				var pos = branch.growDirection.clone();
				pos.multiplyScalar(this.segmentSize);
				pos.add(branch.pos);
				
				var b = new Tree.Segment(pos,branch);
				b.growDirection = branch.growDirection.clone();
				branch.growCount = 0;
				branch.growDirection = new THREE.Vector3(0,0,0);
				this.branches.push(b);
				again = true;
			}
		}
		
		return again;
		//READY TO LOOP AGAIN.
	};
	
	this.addToScene = function()
	{
		var geometry = new THREE.Geometry();
		geometry.vertices = this.cloud;
		this.pointCloud = new THREE.PointCloud(geometry, new THREE.PointCloudMaterial({color: 0x00ff00, size: 0.05}));
		
		if  (this.branchVertices == null || true)
		{
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
	
	
}

Tree.Segment = function(pos,parent){
	this.pos = pos;
	this.parent = parent;
	this.growCount = 0;
	this.growDirection = new THREE.Vector3(0,0,0);
};

/*
function createTree()
{
	var geometry = new THREE.Geometry();
	var vertices = [];
	var tilt = 0;
	var q = new THREE.Quaternion();
	var last = new THREE.Vector3(0,0,0);
	
	createBranch(geometry,last,tilt,0.1,10);
	
	
	return geometry;
}

function createBranch(geometry,start,tilt,potency,count)
{
	var q = new THREE.Quaternion();
	tilt += (Math.random()-0.5)*0.6;
	q.setFromAxisAngle(new THREE.Vector3(0,0,1),tilt);
	var vector = new THREE.Vector3(0,0.5,0);
	vector.applyQuaternion(q);
	geometry.vertices.push(start);
	vector.add(start);
	geometry.vertices.push(vector);
	
	//geometry.vertices.push(start+vector);
	
	if (count > 0 && Math.random()*10-count > potency)
	{
		var te = Math.PI/4;
		if (Math.random()>.5) {te = -te;}
		createBranch(geometry,vector,tilt+te,potency*0.5,count-1);
	}
	
	if (count>0)
	{
		createBranch(geometry,vector,tilt,potency*0.5,count-1);
	}
}
*/
document.onreadystatechange = function () {
  if (document.readyState == "complete") {
    init();
  }
}