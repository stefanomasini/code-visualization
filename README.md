Code Visualization
==================

Real-time WebGL visualization of software projects evolution (Git repo history) via [THREE.js](http://threejs.org/), [RX.js](https://github.com/Reactive-Extensions/RxJS), and functional programming via immutable data structures.

Inspired by [CodeSwarm](https://code.google.com/p/codeswarm/).

Used to make this:

[![Balsamiq Code Evolution 2015](http://img.youtube.com/vi/Ajcd1mF7hXk/0.jpg)](http://www.youtube.com/watch?v=Ajcd1mF7hXk "Balsamiq Code Evolution 2015")

Concepts
--------

**Projects** are masses of variable size that aggregate at the center, growing as more
contributions are made over time, and slowly shrinking otherwise.

**Authors** are rotating spheres textured with the appropriate avatar images that are
attracted by projects, but remain at a certain distance from the center.

**Contributions** are small spheres that shoot out from authors and reach projects.
The size of each sphere is proportionate to the number of files that have been
modified in that given contribution. When an author shoots a contribution it starts
spinning faster, and the corresponding project grows in size. When an author doesn't
contribute for a while, it slows down and shrinks, until it eventually disappears.

How to use
----------

**Prerequisites**

You have to provide a working directory with the following files in it:

 1. `config.json` - global information about projects, authors and git repositories:

    ```
    {
      "title": "My repo visualization",
      "userMap": {
        "git_author_name_1": "pretty_name_1",
        "git_author_name_2": "pretty_name_2",
        "git_author_name_3": "pretty_name_3",
      },
      "projects": [
        {
          "color": 15924992,
          "name": "Project 1",
          "repos": [
           "my_git_account/my-repo-1",
           "my_git_account/my-repo-2",
           "my_git_account/my-repo-3",
           "my_git_account/my-repo-4"
          ]
        },
        {
          "color": 16763136,
          "name": "Project 2",
          "repos": [
           "my_git_account/my-repo-5"
          ]
        },
        {
          "color": 65306,
          "name": "Project 3",
          "repos": [
           "my_git_account/my-repo-6",
           "my_git_account/my-repo-7"
          ]
        }
      ],
      "ignoreIfContaining": [
       ".idea",
       "node_modules/",
       "bower_components/"
      ],
      "reposDirs": [
       "/main/path/to/repos",
       "/another/path/to/repos"
      ]
    }
    ```

    `color` must be expressed in base 10 (due to limitations of the json format).

    Only `title`, `userMap` and `projects` are required for the actual visualization,
    while the rest of the information are used to generate the events from the git
    repositories.

 2. `events.json` - where every line is a json representation of a single contribution, like this:

    `{"project": "My Project", "ts": 1232361996000, "author": "Some Name"}`

    `ts` is an epoch timestamp expressed in milliseconds, and the lines must be
    sorted by said timestamp.

    For the above ~5 minutes video the file is about 30 Mb in size.

 3. An `avatars` directory containing one image for each author. The name must match
    the one expressed in the above json files and the format must be jpeg (`.jpg` extension, lowercase).
    Ideally, it should be square, with the side length being a power of 2, but I noticed that
    the THREE.js library is able to resize them.

The `events.json` file must be produced offline. In my case I've hacked together
the provided Python script that runs `git log` over several repositories, parses the output
and aggregates the results.

**Command line**

Install dependencies with:

`npm install`

Compile the frontend and run the server with:

`npm start <workdir_path>`

Then point your browser to `http://localhost:4080/` and enjoy the show. :-)

If you want to watch the source files, run the following in a separate shell:

`npm run watch`

Run the tests with:

`npm test`

Generate the `events.json` file with:

`npm run events <workdir_path> writeEvents`

Update/clone the git repositories with:

`npm run events <workdir_path> updateRepos`

Client-Server Architecture
------------

Conceptually the visualization is not different than playing a video.
The browser consumes events and the server sends them over a little
bit at a time. The streaming happens over a WebSocket, modeled in
the browser via an Rx.JS [Subject](http://reactivex.io/documentation/subject.html)
(using `Rx.DOM.fromWebSocket`). The client (`events.js`) requests
chunks of 500 events at a time and always tries to keep a buffer of 1000 unprocessed
events ready for consumption. These numbers have been chosen by trial and
error basing on my own workload, so your mileage may vary.

Events consumption
-------

Each event carries a real-world timestamp, that is used to show the
real-world date in the upper right corner of the screen, but when events
are processed, their timestamp is scaled according to a factor defined
in `constants.js`. Currently 10 days become 1 second, to keep the overall
visualization duration within 5 minutes.

The world objects are updated once every 20ms (i.e. about 5 hours in the
real world), so every time an appropriate number of events is taken
from the buffer and grouped into a block that is processed as a whole.
These 20ms intervals are called *world ticks*, and represent the frequency
at which the objects in the scene are updated.

World Physics
-------

At every world tick the collected events (i.e. authors contributing to projects)
are grouped in author-project pairs. Each of these groups becomes a sphere whose
size is proportional to the amount of events for that particular contribution
(i.e. number of changed files). These groups further determine whether new authors
and projects should be added to the scene, if existing authors
should spin faster and if existing projects should grow in size.

Using the updated information, the physics of the model is updated, using the
following simple rules:

 1. Every project is attracted with constant force towards the center of the scene.

 2. Projects that are too close repel each other with a force that is proportional
 to the amount of physical overlap.

 3. Authors are attracted to the project they last contributed to with a force that
 is proportional to their spinning velocity.

 4. Authors that get too close to the center are repelled with a constant force.

 5. Authors that are too close repel each other with a force that is proportional
 to the amount of physical overlap (just like projects).

 6. Projects shrink of a constant amount every tick.

 7. Authors spinning speed decreases of a constant amount every tick.

Rules 2 and 5 prevent objects from overlapping with each other. Rule 1 makes it for
a nice and compact nucleus of projects. Rule 3 aims to align authors closer to the
projects they contribute to, rule 4 is to keep authors separate from projects
so that contributions have some meaningful distance to travel and be noticeable,
rules 6 and 7 are meant to keep less active projects smaller, and less active authors
slower and smaller, too.

The math powering the model
------

At every tick, for every object, the computed force brutally approximates
acceleration, which in turn brutally determines a change in velocity from the
previous tick. The updated velocity finally determines a change in the position
from the previous tick. The calculations are made on a plane using simple 2D vectors,
expressed in either cartesian or polar coordinates, converted between the two
representations as convenience dictates.

The objects are represented as immutable data structures and model-updating functions
are side-effect free, always returning new copies of the data. Using the ES6 spread
operator makes it fast and efficient.

All of the above calculations happen within a world tick, which has been choosen to
be 20ms because it's fast enough to yield a decent approximation of the physical model,
and slow enough not to cause too much CPU overhead. A faster update frequency would
probably improve the noticeable jitter of objects like authors that balance in equilibrium
between strong opposing forces, but I haven't experimented with that yet.

UI Rendering with THREE.js
------

The UI rendering happens at a totally independent frequency because the `draw` method
is invoked using `requestAnimationFrame` which hits approximately at 60 fps (~16 ms).

At each invocation, the `draw` method takes the model objects and checks against a
cache of THREE.js scene objects, to see whether the corresponding DOM object already
exists, and creates it otherwise. The DOM object properties are then updated according
to the new information (coordinates, matrix-transformation, color). Scene objects
corresponding to dead model objects are removed from the DOM. In other words: a
"virtual-DOM for dummies" approach.

Structure of the code
------

 - `server.js` - The node.js server side component.
 - `entrypoint.js` - Is the UI main entry point, where most of the Rx.JS fun happens.
 - `view.js` - The code to build and update the scene, where the THREE.js fun happens.
 - `events.js` - The code reading events from the server, using a WebSocket, where the aggregation into 20ms
 chunks happens. This could receive more Rx.JS love.
 - `model.js` - The model-updating functions.
 - `constants.js` - Just a bunch of constants, mostly hacked on a trial and error basis.
 - `cache.js` - A utility class to implement a cache of DOM objects.
 - `utils.js` - Vector math utility functions.
