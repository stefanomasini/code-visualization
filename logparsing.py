import subprocess, os, StringIO, datetime, time


gitPath = subprocess.check_output('which git', shell=True).strip()


def runGit(cwd, cmd):
    gitCmdline = gitPath + " " + cmd
    # print '%s> %s' % (cwd, gitCmdline)
    return subprocess.check_output(gitCmdline, shell=True, cwd=os.path.abspath(cwd))


def runGitAndIterChanges(repoPath):
    LOG_SEPARATOR = "------------------------------------------------------------------------"

    format = "%n" + LOG_SEPARATOR + "%nr%h | %ae | %ai (%aD) | x lines%nChanged paths:"
    log = runGit(repoPath, "log --name-status --all --pretty=format:'%s'" % format)
    fd = StringIO.StringIO(log.decode('utf-8'))

    line = fd.readline()
    while len(line) > 0:
        if line.startswith(LOG_SEPARATOR):
            rev_line = fd.readline()
            if rev_line == '' or len(rev_line) < 2:
                break
            rev_parts = rev_line.split(' | ')
            try:
                author = rev_parts[1]
            except IndexError:
                print >> sys.stderr, "Skipping bad line: %s" % rev_line
                line = fd.readline()
                continue
            date_parts = rev_parts[2].split(" ")
            date = date_parts[0] + " " + date_parts[1]
            try:
                dateObj = datetime.datetime.strptime(date, '%Y-%m-%d %H:%M:%S')
                date = time.strptime(date, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                print >> sys.stderr, "Skipping malformed date: " + str(date)
                continue
            date = int(time.mktime(date)) * 1000

            # Skip the 'Changed paths:' line and start reading in the changed filenames.
            fd.readline()
            path = fd.readline()
            while len(path) > 1:
                ch_path = None
                # git uses quotes if filename contains unprintable characters
                ch_path = path[2:].replace("\n", "").replace("\"", "")
                yield ch_path, date, author
                path = fd.readline()

        line = fd.readline()


def pullRepo(repoPath):
    runGit(repoPath, "pull")


def cloneRepo(dirPath, repoUrl):
    runGit(dirPath, "clone %s" % repoUrl)
