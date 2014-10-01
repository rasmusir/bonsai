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
	
	var light = new THREE.DirectionalLight( 0xfffff0, 1);
	light.position.set(1,1,1);
	scene.add(light);
	
	var ambientLight = new THREE.AmbientLight(0x505050);
	scene.add(ambientLight);
	
	t = new Tree();
	t.createCloud(new THREE.Vector3(-0.8,1.3,0),new THREE.Vector3(3,1,3),1000);
	t.generateStem(1);
	
	gi = setInterval(grow,10);
	
	camera.position.z = 2.5;
	camera.position.y = 1;
	render();
}

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
	if (t.branchLines != null)
		t.branchLines.rotation.y = rot;
	if (t.mesh != null)
		t.mesh.rotation.y = rot;
	if (t.leavesMesh != null)
		t.leavesMesh.rotation.y = rot;
	
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
	this.thicknessMultiplier = 0.003;
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
				pos = new THREE.Vector3((Math.random()-0.5)*2,(Math.random()-0.5)*2,(Math.random()-0.5)*2);
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
			var point = this.cloud[i], skip = false;
			var closestBranch = null, closestDistance = maxDistance;
			for (var j = 0; j<this.branches.length; j++)
			{
				var branch = this.branches[j];
				var dist = point.distanceTo(branch.pos);
				if (dist > maxDistance || branch.ignore == true)
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
		
		for (var i = this.branches.length - 1; i>=1; i--)
		{
			var branch = this.branches[i];
			if (branch.growCount > 0)
			{
				branch.growDirection.divideScalar(branch.growCount);
				branch.growDirection.normalize();
				var pos = branch.growDirection.clone();
				pos.multiplyScalar(this.segmentSize);
				pos.add(branch.pos);
				
				var b = new Tree.Segment(pos,branch);
				b.growDirection = branch.growDirection.clone();
				branch.growCount = 0;
				branch.growDirection = new THREE.Vector3(0,0,0);
				this.branches.push(b);
				
				again = true;
				branch.grew++;
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
			
			var g = new THREE.CylinderGeometry(0.1,0.1,this.segmentSize,6,1,true);
			//var m = 
			
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
	
	this.buildMesh = function()
	{
		var geometry = new THREE.Geometry();
		
		for (var i = 1; i<this.branches.length; i++)
		{
			var b = this.branches[i];
			var g = new THREE.CylinderGeometry(b.age*this.thicknessMultiplier,b.parent.age*this.thicknessMultiplier,this.segmentSize,8,1,true);
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
}

Tree.Segment = function(pos,parent){
	this.pos = pos;
	this.parent = parent;
	this.growCount = 0;
	this.age = 0;
	this.grew = 0;
	this.ignore = false;
	this.growDirection = new THREE.Vector3(0,0,0);
};

document.onreadystatechange = function () {
  if (document.readyState == "complete") {
    init();
  }
}