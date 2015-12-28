export const tickInterval = 20;

const ONE_DAY = 24 * 3600 * 1000;
const ONE_SECOND = 1000;
export const eventsSpeedupFactor = 10 * ONE_DAY / ONE_SECOND;


export const contributionLifespan = 2000;
export const projectLifespan = 3000;

export const newAuthorRadius = 1500;
export const projectsRadius = 700;
export const authorsRadius = 1000;
export const authorVisibleSize = 200;
export const forceAuthorAway = 0.05;
export const forceToProject = 0.00005;

export const eventsBufferAllowance = 1000;
export const eventsBufferChunkSize = 500;

export const maxContributionSize = 100;

export const authorMinSpeedIncreateAtEveryContribution = 10;
export const authorSpeedDecreaseAtEveryTick = 1;
export const maxAuthorMomentum = 300;
export const authorInactivityTimeout = 2000;

export const projectInactivityTimeout = 2000;
export const maxProjectSize = 500;
export const projectSizeDecreaseAtEveryTick = 1;
export const projectSizeBase = 100;

export const forceToCenter = 0.005;
export const speedStaticFriction = 0;
export const speedDynamicFriction = 0.2;
export const projectRepulsion = 0.001;
export const maxProjectRepulsion = 0.01;

export const projectsDistance = 200;
