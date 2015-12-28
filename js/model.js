import * as constants from './constants';
import { cart2polar, polar2cart, vectorAndDistanceBetweenTwoPoints, scaleXYVector, addXYVectors } from './utils';

export function buildWorld() {
    return {
        authors: {},
        projects: {},
        contributions: [],
        ts: 0,
    };
}

export function advanceWorldTick(world, tick) {
    world = applyEventsToWorld(tick.events, world, tick.elapsed);
    world = filterDeadObjects(world, tick.elapsed);
    world = slowDownAuthorsSpeed(world, tick.elapsed);
    world = shrinkProjectSize(world, tick.elapsed);
    world = moveProjects(world);
    world = moveAuthors(world);
    world = {
        ...world,
        ts: tick.elapsed,
        realWorldTs: tick.realWorldTs,
    }
    return world;
}

function moveProjects(world) {
    var projects = dict2List(world.projects);
    var updatedProjects = projects.map(sourceProject => {
        var acceleration = getForceToCenter(sourceProject, { x: 0, y: 0 }, constants.forceToCenter);
        projects.forEach(dstProject => {
            if (dstProject !== sourceProject) {
                const forceAway = getRepulsiveContactForce(sourceProject.pos, dstProject.pos, calcVisibleProjectSize(sourceProject), calcVisibleProjectSize(dstProject), constants.projectsDistance);
                acceleration = addXYVectors(acceleration, forceAway);
            }
        });
        return updatePosUsingSpeedAndAcceleration(sourceProject, acceleration);
    });
    return replaceProjectsFromList(world, updatedProjects);
}

function moveAuthors(world) {
    var authors = dict2List(world.authors);
    var updatedAuthors = authors.map(sourceAuthor => {
        var attractionPos = {x: 0, y: 0};
        if (sourceAuthor.lastContributions.length > 0) {
            const lastContribution = sourceAuthor.lastContributions[sourceAuthor.lastContributions.length-1];
            const dstProject = world.projects[lastContribution.project];
            attractionPos = dstProject.pos;
        }

        var acceleration = scaleXYVector(getForceToCenter(sourceAuthor, attractionPos, constants.forceToProject), sourceAuthor.momentum);

        var polarPos = cart2polar(sourceAuthor.pos);
        var tooClose = polarPos.r - constants.authorsRadius;
        if (tooClose < 0) {
            const forceAwayFromCenter = polar2cart({a: polarPos.a, r: constants.forceAuthorAway});
            acceleration = addXYVectors(acceleration, forceAwayFromCenter);
        }
        authors.forEach(dstAuthor => {
            if (dstAuthor !== sourceAuthor) {
                const forceAway = getRepulsiveContactForce(sourceAuthor.pos, dstAuthor.pos, constants.authorVisibleSize, constants.authorVisibleSize, constants.projectsDistance);
                acceleration = addXYVectors(acceleration, forceAway);
            }
        });
        return updatePosUsingSpeedAndAcceleration(sourceAuthor, acceleration);
    });
    return replaceAuthorsFromList(world, updatedAuthors);
}

function getForceToCenter(obj, dst, forceFactor) {
    const toCenter = vectorAndDistanceBetweenTwoPoints(obj.pos, dst);
    return scaleXYVector(toCenter.v, toCenter.dist > 0 ? forceFactor : 0);
}

function getRepulsiveContactForce(src, dst, srcSize, dstSize, minimumDistance) {
    const toOther = vectorAndDistanceBetweenTwoPoints(src, dst);
    const visibleDistance = srcSize/2 + dstSize/2 + minimumDistance;
    const negativeOverlapping = toOther.dist - visibleDistance;
    return scaleXYVector(toOther.v,
            negativeOverlapping < 0 ?
            Math.min(constants.projectRepulsion * negativeOverlapping, constants.maxProjectRepulsion)
            : 0
    );
}

function updatePosUsingSpeedAndAcceleration(obj, acceleration) {
    const dv = scaleXYVector(acceleration, constants.tickInterval);
    const speedPolar = cart2polar(addXYVectors(obj.speed, dv));
    const staticFriction = constants.speedStaticFriction * constants.tickInterval;
    const speedPolarAfterFriction = {...speedPolar, r: Math.max(speedPolar.r * (1-constants.speedDynamicFriction) - staticFriction, 0)}
    const speed = polar2cart(speedPolarAfterFriction);
    const dpos = scaleXYVector(speed, constants.tickInterval);
    const pos = addXYVectors(obj.pos, dpos)
    return {
        ...obj,
        speed: speed,
        pos: pos,
    };
}

function replaceAuthorsFromList(world, authorsList) {
    var newAuthors = {};
    authorsList.forEach(author => newAuthors[author.name] = author);
    return {
        ...world,
        authors: newAuthors,
    };
}

function replaceProjectsFromList(world, projectsList) {
    var newProjects = {};
    projectsList.forEach(project => newProjects[project.name] = project);
    return {
        ...world,
        projects: newProjects,
    };
}

function shrinkProjectSize(world, ts) {
    var newProjects = {}
    Object.keys(world.projects).forEach(name => {
        const updatedProject = shrinkProject(world.projects[name], ts)
        newProjects[name] = updatedProject;
        if (ts - world.projects[name].lastActiveAt < (constants.contributionLifespan + constants.projectLifespan)) {
        }
    })
    return {
        ...world,
        projects: newProjects,
    }
}

function shrinkProject(project, ts) {
    var newSize = Math.min(Math.max(project.size - constants.projectSizeDecreaseAtEveryTick, 0), constants.maxProjectSize);
    return {
        ...project,
        size: newSize,
        lastActiveAt: newSize > 0 ? ts : project.lastActiveAt,
    }
}

function slowDownAuthorsSpeed(world, ts) {
    var newAuthors = {}
    Object.keys(world.authors).forEach(name => {
        const updatedAuthor = slowDownAuthor(world.authors[name], ts)
        if (ts - updatedAuthor.lastActiveAt < constants.authorInactivityTimeout) {
            newAuthors[name] = updatedAuthor;
        }
    })
    return {
        ...world,
        authors: newAuthors,
    }
}

function slowDownAuthor(author, ts) {
    var newMomentum = Math.min(Math.max(author.momentum - constants.authorSpeedDecreaseAtEveryTick, 0), constants.maxAuthorMomentum);
    return {
        ...author,
        momentum: newMomentum,
        rotation: author.rotation + newMomentum,
        lastActiveAt: newMomentum > 0 ? ts : author.lastActiveAt,
    }
}

function filterDeadObjects(world, now) {
    return {
        ...world,
        contributions: world.contributions.filter(c => c.started + constants.contributionLifespan > now)
    }
}

function applyEventsToWorld(events, world, elapsed) {
    var contribs = new Map();
    events.forEach(event => {
        world = updateAuthorsAndProjects(world, event.author, event.project, elapsed);
        var key = `${event.author}-${event.project}`;
        if (!contribs.has(key)) {
            contribs.set(key, 0);
        }
        contribs.set(key, contribs.get(key) + 1);
    });
    for ( var [k, size] of contribs.entries()) {
        var [authorName, projectName] = k.split('-');
        world = addContribution(world, buildContribution(authorName, projectName, size, elapsed));
    }
    return world;
}

function buildContribution(authorName, projectName, size, elapsed) {
    return {
        key: `${authorName}-${projectName}-${elapsed}`,
        author: authorName,
        project: projectName,
        size: Math.min(size, constants.maxContributionSize),
        started: elapsed,
    };
}

function addContribution(world, contribution) {
    return {
        ...world,
        contributions: world.contributions.concat([contribution]),
        authors: {
            ...world.authors,
            [contribution.author]: addContributionToAuthor(world.authors[contribution.author], contribution),
        },
        projects: {
            ...world.projects,
            [contribution.project]: addContributionToProject(world.projects[contribution.project], contribution),
        }
    }
}

function addContributionToProject(project, contribution) {
    return {
        ...project,
        size: project.size + contribution.size,
        lastActiveAt: contribution.started,
    }
}

function addContributionToAuthor(author, contribution) {
    return {
        ...author,
        lastContributions: author.lastContributions.slice(1, 10).concat([contribution]),
        momentum: author.momentum + Math.max(contribution.size, constants.authorMinSpeedIncreateAtEveryContribution),
    }
}

function updateAuthorsAndProjects(world, author, project, elapsed) {
    if (!world.projects[project]) {
        world = {
            ...world,
            projects: {
                ...world.projects,
                [project]: buildProject(project, world, elapsed),
            }
        }
    }
    if (!world.authors[author]) {
        world = {
            ...world,
            authors: {
                ...world.authors,
                [author]: buildAuthor(author, project, world, elapsed),
            }
        }
    }
    return world;
}

function buildAuthor(name, project, world, elapsed) {
    return {
        key: `${name}-${elapsed}`,
        name: name,
        started: elapsed,
        pos: polar2cart({...cart2polar(world.projects[project].pos), r: constants.newAuthorRadius}),
        speed: {x: 0, y: 0},
        lastContributions: [],
        momentum: 0,
        rotation: 0,
        lastActiveAt: elapsed,
    }
}

function buildProject(name, world, elapsed) {
    return {
        key: `${name}-${elapsed}`,
        name: name,
        started: elapsed,
        size: 0,
        lastActiveAt: elapsed,
        pos: placeAround(world.projects, 500),
        speed: {x: 0, y: 0},
    }
}

function placeAround(otherProjects, radius) {
    var otherProjects = dict2List(otherProjects);
    return polar2cart({a: Math.PI/2 + Math.PI/3 * otherProjects.length, r: radius});
}


function calcVisibleProjectSize(project) {
    return constants.projectSizeBase * visibleProjectSizeScale(project);
}

export function visibleProjectSizeScale(project) {
    return 0.3 + project.size / constants.maxProjectSize;
}

function findBariCenter(projects) {
    var [sum_x, sum_y, tot] = projects.reduce(([acc_x, acc_y, acc_tot], project) => [
        acc_x + project.pos.x*project.size,
        acc_y + project.pos.y*project.size,
        acc_tot + project.size],
        [0, 0, 0]);
    if (tot === 0) {
        return { x: 0, y: 0 };
    }
    return {
        x: sum_x / tot,
        y: sum_y / tot,
    }
}

function dict2List(d) {
    return Object.keys(d).map(name => d[name]);
}
