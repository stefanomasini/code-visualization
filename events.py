import json, os, sys
from logparsing import runGitAndIterChanges, pullRepo, cloneRepo

if len(sys.argv) < 2:
    print "Missing work directory parameter."
    sys.exit(1)

workDir = sys.argv[1]

if not os.path.exists(workDir):
    print "Path %s does not exist." % workDir
    sys.exit(1)

if not os.path.isdir(workDir):
    print "Path %s is not a directory." % workDir
    sys.exit(1)

workDir = os.path.abspath(workDir)

allowedCommands = 'writeEvents', 'updateRepos'

if len(sys.argv) < 3:
    print "Missing command parameter (%s)." % ', '.join(allowedCommands)
    sys.exit(1)

command = sys.argv[2]

if command not in allowedCommands:
    print "Unknown command %s (only %s)." % (command, ', '.join(allowedCommands))
    sys.exit(1)


config = json.load(open(os.path.join(workDir, 'config.json')))


def iterRepos():
    for project in config['projects']:
        for repoName in project['repos']:
            yield {
                'name': repoName,
                'project': project['name']
                }


def findRepoPath(repoName):
    repoName = repoName.split('/')[-1]
    for reposDir in config['reposDirs']:
        candidate = os.path.join(reposDir, repoName)
        if os.path.exists(candidate):
            return candidate
    raise Exception('Cannot find path of repo %s' % repoName)


def iterUnsortedEvents(onMissingAuthors):
    missingAuthors = set()
    allRepos = list(iterRepos())
    for idx, repo in enumerate(allRepos):
        print '%d/%d) %s' % (idx+1, len(allRepos), repo['name'])
        repoPath = findRepoPath(repo['name'])
        for path, ts, author in runGitAndIterChanges(repoPath):
            if author not in config['userMap']:
                missingAuthors.add(author)
            else:
                author = config['userMap'][author]
            event = Event(repo['project'], path, ts, author)
            if filterEvent(event):
                yield event
    if missingAuthors:
        onMissingAuthors(list(sorted(missingAuthors)))


class Event(object):
    def __init__(self, projectName, filename, ts, author):
        self.projectName = projectName
        self.filename = filename
        self.ts = int(ts)
        self.author = author

    def toJson(self):
        return {
            'ts': self.ts,
            'project': self.projectName,
            'author': self.author,
        }

    def __cmp__(self, other):
        return cmp(self.ts, other.ts)


def update_repos():
    repos = list(iterRepos())
    for idx, repo in enumerate(repos):
        print '%d/%d) %s' % (idx+1, len(repos), repo['name'])
        repoPath = findRepoPath(repo['name'])
        if os.path.exists(repoPath):
            print '  git pull %s' % repoPath
            pullRepo(repoPath)
        else:
            print '  git clone %s' % repoPath
            cloneRepo(config['reposDirs'][0], 'https://github.com/%s.git' % repo['name'])


def filterEvent(event):
    for text in config['ignoreIfContaining']:
        if text in event.filename:
            return False
    return True


def writeSortedEventStream(events):
    with file(os.path.join(workDir, 'events.stream'), 'w') as fd:
        for event in sorted(list(events)):
            print >> fd, json.dumps(event.toJson())


# Main entry point.
if __name__ == "__main__":
    if command == 'updateRepos':
        update_repos()
    elif command == 'writeEvents':
        def onMissingAuthors(authors):
            print "\nMissing authors:\n"
            for authorName in sorted(authors):
                print repr(authorName)
                print json.dumps(authorName)
            print "\nPlease add them to config.json"
        sortedEvents = sorted(list(iterUnsortedEvents(onMissingAuthors)))
        print 'Writing events.stream...'
        writeSortedEventStream(sortedEvents)
        print '... done.'

    # with file('projects.json', 'w') as fd:
    #     json.dump({
    #         'projects': [{
    #             'name': p['name'],
    #             'color': p['color'],
    #          } for p in config['projects']],
    #     }, fd)



