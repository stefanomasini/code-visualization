import THREE from 'three';
import * as constants from './constants';
import { visibleProjectSizeScale } from './model';
import { ObjectCache } from './cache';


var textures = {};

export function preloadTextures(authors) {
    authors.forEach(name => {
        var texture = THREE.ImageUtils.loadTexture(`avatars/${name}.jpg`);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set( 1, 1 );
        textures[`avatar-${name}`] = texture;
    });
}

export function buildWorldObjects(world, t, allProjectsDict) {
    return world.contributions.map(contribution => buildContributionObject(contribution, world, t, allProjectsDict))
        .concat(Object.keys(world.authors).map(authorName => buildAuthorObject(world.authors[authorName], world, t, allProjectsDict)))
        .concat(Object.keys(world.projects).map(projectName => buildProjectObject(world.projects[projectName], world, t, allProjectsDict)).filter(p => p !== null));
}

function buildAuthorObject(author, world, t, allProjectsDict) {
    var [r, g, b] = [0, 0, 0];
    var colors = [];
    author.lastContributions.forEach(c => {
        for (var i=0; i < c.size; i += 1) {
            colors.push(allProjectsDict[c.project].color);
        }
    });
    var texture = textures[`avatar-${author.name}`] || null;
    return {
        key: author.key,
        builder: () => buildSphere(constants.authorVisibleSize, {texture: texture, color: texture ? null : colors[0]}),
        text: author.name,
        matrix: compose(
            translate(author.pos.x, author.pos.y, 0),
            rotateFromAxisAngle(0, 1, 0, author.rotation/1000),
            rotateFromAxisAngle(0, 0, 1, 3.14),
            rotateFromAxisAngle(1, 0, 0, 2.8),
            scale(0.5 + 0.5 * author.momentum / constants.maxAuthorMomentum),
            wobble(t + author.started, 0.05, 500),
        ),
    };
}

function buildProjectObject(project, world, t, allProjectsDict) {
    return {
        key: project.key,
        builder: () => buildSphere(constants.projectSizeBase, {color: allProjectsDict[project.name].color}),
        text: project.name,
        matrix: compose(
            translate(project.pos.x, project.pos.y, 0),
            rotateFromAxisAngle(1, 0, 0, Math.PI / 4),
            rotateFromAxisAngle(0, 0, 1, periodInMs(t, 5000)),
            scale(visibleProjectSizeScale(project)),
            wobble(t + project.started, 0.05, 500),
        ),
    };
}


function buildSphere(radius, {color = null, texture = null, opacity = 1}) {
    var meridians=32, paralles=32;
    return new THREE.Mesh(
        new THREE.SphereBufferGeometry(radius, meridians, paralles),
        new THREE.MeshBasicMaterial( {
            transparent: opacity < 1,
            opacity: opacity,
            color: color,
            wireframe: false,
            map: texture,
        } )
    );
}

function applyMatrixToVector(m) {
    var v = new THREE.Vector3();
    v.applyMatrix4(m);
    return { x: v.x, y: v.y, z: v.z, v }
}

function buildContributionObject(contribution, world, t, allProjectsDict) {
    const progress = (world.ts - contribution.started) / constants.contributionLifespan;
    var author = world.authors[contribution.author];
    var project = world.projects[contribution.project];
    const a = new THREE.Vector3(author.pos.x, author.pos.y, 0);
    const b = new THREE.Vector3(project.pos.x, project.pos.y, 0);
    return {
        key: contribution.key,
        builder: () => buildSphere(contribution.size, {color: allProjectsDict[contribution.project].color, opacity: 0.4}),
        matrix: compose(
            movingBetweenPoints(a, b, progress),
            rotateFromAxisAngle(1, 0, 0, Math.PI / 4),
            rotateFromAxisAngle(0, 0, 1, periodInMs(t, 5000)),
            scale(1 + 2*Math.sin(Math.PI * progress)),
            wobble(t + contribution.started, 0.05, 500),
        )
    };
}

function movingBetweenPoints(a, b, progress) {
    progress = (1-Math.cos(Math.PI * progress))/2;
    return translate(
        a.x + (b.x- a.x) * progress,
        a.y + (b.y- a.y) * progress,
        a.z + (b.z- a.z) * progress
    );
}

function compose(...matrixes) {
    return matrixes.reduce((acc, m) => acc.multiply(m), new THREE.Matrix4());
}

function applyMatrix(obj, m) {
    obj.matrix.identity();
    obj.applyMatrix(m);
}

function periodInMs(t, frequencyInMs) {
    return t / frequencyInMs * 2*Math.PI;
}

function sinWave(min, max, period) {
    return min + (1+Math.sin(period))/2 * (max-min);
}

function rotateFromAxisAngle(x, y, z, angle) {
    return rotateFromQuaternion(quaternionFromAxisAngle(x, y, z, angle))
}

function wobble(t, delta, frequencyInMs) {
    const period = periodInMs(t, frequencyInMs);
    return scaleMatrix(
        sinWave(1-delta, 1+delta, period * 0.7),
        sinWave(1-delta, 1+delta, period * 1.0),
        sinWave(1-delta, 1+delta, period * 1.3)
    );
}

function scale(s) {
    return scaleMatrix(s, s, s);
}

function translate(dx, dy, dz) {
    var m = new THREE.Matrix4();
    m.makeTranslation(dx, dy, dz);
    return m;
}

function scaleMatrix(sx, sy, sz) {
    var m = new THREE.Matrix4();
    m.scale(new THREE.Vector3(sx, sy, sz));
    return m;
}

function quaternionFromAxisAngle(x, y, z, angle) {
    var quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle( new THREE.Vector3(x, y, z), angle);
    return quaternion;
}

function rotateFromQuaternion(q) {
    var m = new THREE.Matrix4();
    m.makeRotationFromQuaternion(q);
    return m;
}

export class Scene {
    constructor(screenWidth, screenHeight, allProjectsDict, addRendererToDOM) {
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        this.allProjectsDict = allProjectsDict;

        this.camera = new THREE.PerspectiveCamera( 50, this.screenWidth / this.screenHeight, 1, 10000 );
        this.camera.position.z = 3500;

        //camera.position.y = -3500;
        //camera.applyMatrix(rotateFromAxisAngle(1, 0, 0, Math.PI/4));

        this.renderer = new THREE.WebGLRenderer( { antialias: true } );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( this.screenWidth, this.screenHeight );
        this.renderer.domElement.style.position = "relative";

        addRendererToDOM(this.renderer.domElement);

        this.renderer.autoClear = false;

        this.threeObjCache = new ObjectCache();
        this.textObjCache = new ObjectCache();

        this.scene = new THREE.Scene({
            fog: new THREE.Fog({ color: 0x330000, near: 1, far: 100 })
        });
    }

    resizeScreen(newWidth, newHeight) {
        this.screenWidth = newWidth;
        this.screenHeight = newHeight;

        this.renderer.setSize( newWidth, newHeight );

        this.camera.aspect = newWidth / newHeight;
        this.camera.updateProjectionMatrix();
    }

    toScreenXY(pos) {
        var p = new THREE.Vector3(pos.x, pos.y, pos.z);
        var vector = p.project(this.camera);

        return {
            x: (vector.x + 1) / 2 * this.screenWidth,
            y: -(vector.y - 1) / 2 * this.screenHeight
        };
    }

    draw({ts, world}) {
        var { getObj: getThreeObj, cleanup: cleanupThreeObjs } = this.threeObjCache.iteration();
        var { getObj: getTextObj, cleanup: cleanupTextObjs } = this.textObjCache.iteration();
        buildWorldObjects(world, ts, this.allProjectsDict).forEach(obj => {
            let domObj = getThreeObj(obj.key, () => {
                let domObj = obj.builder();
                this.scene.add(domObj);
                return domObj;
            });
            applyMatrix(domObj, obj.matrix);

            if (obj.text) {
                var pos3D = applyMatrixToVector(obj.matrix);
                var pos2D = this.toScreenXY(pos3D);

                let textDomObj = getTextObj(obj.key, () => {
                    let textDomObj = document.createElement('div');
                    textDomObj.id = `label-${obj.key}`
                    textDomObj.style.position = 'absolute';
                    textDomObj.style.width = 100;
                    textDomObj.style.height = 100;
                    textDomObj.style['text-align'] = 'center';
                    return document.body.appendChild(textDomObj);
                });
                textDomObj.innerHTML = obj.text;
                textDomObj.style.top = `${pos2D.y+32}px`;
                textDomObj.style.left = `${pos2D.x}px`;
            }
        });
        cleanupThreeObjs(domObj => this.scene.remove(domObj));
        cleanupTextObjs(textDomObj => textDomObj.remove());

        this.renderer.clear();
        this.renderer.setViewport(0, 0, this.screenWidth, this.screenHeight);
        this.renderer.render(this.scene, this.camera);
    }
}
