//|**********************************************************************;
//* Project           : Qa test results webpage
//*
//* Author            : Patrick Plamper
//*
//* Date created      : 10.11.2019
//*
//* Purpose           : Defines all possible routes which can be accessed
//*
//|**********************************************************************;

const express = require('express');
const path = require('path');
const fs = require('fs');
const lockfile = require('proper-lockfile');
const getSize = require('get-folder-size');
const { exec } = require('child_process');
const moment = require('moment-timezone');
const mime = require('mime-types');
const targz = require('targz');
const router = express.Router();
const result_dirname = '/var/www/html/qa_test_results/'
const path_to_video_converter = "/home/integration/video_converter/bin/video_converter";

// Prioritize video conversion
router.get('*/prio', function (req, res) {
    var href = req.query.href;
    href = href.replace(/\||\&|\?|\*|\;/gi,'');
    var url = req.originalUrl;
    url = url.substring(0, url.indexOf('/prio'));
    var path = '/var/www/html' + url + '/' + href;
    exec('readlink -f ' + path, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            res.send("Error");
        }
        path = stdout.replace(/nfs\//i, "");
        path = path.trim();
        exec("ssh localhost \"" + path_to_video_converter + " rpc 'VideoConverter.prioritize(\\\"" +
              path + "\\\")'\"", (err, stdout, stderr) => {
            if (err) {
                console.error(`exec error: ${err}`);
                res.send("Error");
            }
            else {
                res.send(href);
            }
        });
    });
});

// Compress selected test result
router.get('*/compress', function (req, res, next) {
    var href = req.query.href;
    var path = req.path;
    path = path.substring(0, path.indexOf('/compress'));
    var url = result_dirname + path + '/' + href;
    var stats = fs.lstatSync(url);
    var mtime = moment(stats.mtime, 'Europe/Berlin');
    var tar_dest = href + '_' + mtime + '.tar.gz';
    var zip_name = result_dirname + '.comp/' + tar_dest;
    var dest_zip_name = result_dirname + '.comp/_' + tar_dest;

    if (! fs.existsSync(zip_name)) {
        //lockfile.check(result_dirname + '.comp/lockfile', {retries: 50000})
        //.then((isLocked) => {
        //    console.log(isLocked);
        //});
        //lockfile.lock(result_dirname + '.comp/lockfile')
        //.then((release) => {
            targz.compress({
                src: url,
                dest: dest_zip_name,
                tar: {},
                gz: {
                    level: 1,
                    memLevel: 9
                }
            }, function(err){
                if(err) {
                    //lockfile.unlock(result_dirname + '.comp/lockfile');
                    res.send("Error");
                } else {
                    fs.rename(dest_zip_name, zip_name, function(err) {
                        if ( err ) console.log('ERROR: ' + err);
                    });
                    //lockfile.unlock(result_dirname + '.comp/lockfile');
                    res.send(tar_dest);
                }
            });
        //})
        //.catch((e) => {
        //    console.error(e)
        //});
    } else {
        res.send(tar_dest);
    }
});

// Render video iframe
router.use('/*.webm', function(req, res, next) {
    var page = req.path;
    var url = req.baseUrl;
    var path = '/var/www/html' + url;
    var stat = fs.statSync(path.replace(/\/\s*$/, ""));
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1]
            ? parseInt(parts[1], 10)
            : fileSize-1

        const chunksize = (end-start)+1
        const file = fs.createReadStream(path, {start, end})
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/webm',
        }
        res.writeHead(206, head)
        file.pipe(res)
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/webm',
        }
        res.writeHead(200, head)
        fs.createReadStream(path).pipe(res)
    }
});

// Render video iframe
router.use('/*.mp4', function(req, res, next) {
    var page = req.path;
    var url = req.baseUrl;
    var path = '/var/www/html' + url;
    var stat = fs.statSync(path.replace(/\/\s*$/, ""));
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1]
            ? parseInt(parts[1], 10)
            : fileSize-1

        const chunksize = (end-start)+1
        const file = fs.createReadStream(path, {start, end})
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
        }
        res.writeHead(206, head)
        file.pipe(res)
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        }
        res.writeHead(200, head)
        fs.createReadStream(path).pipe(res)
    }
});


// Grep all test result informations
router.use('*/integration_status', function (req, res, next) {
    if ( req.cookies['qa'] === 'chuckthenorris'){
      res.render('integration_status_admin', {
          title: 'Integration Status'
      });
    } else {
      res.render('integration_status', {
          title: 'Integration Status'
      });
    }
});

// Grep all test result informations
router.use('*/looptest_overview', function (req, res, next) {
    var serverName = '';
    var page = './';
    var origin_url = '';
    var result = '';
    var url_path = req.path;
    url_path = url_path.substring(url_path.indexOf("/") + 1);
    var folder = '/var/www/html/qa_test_results/' + url_path ;
    const fileStats = fs.statSync(folder.replace(/\/\s*$/, ""));
    var hostname = req.get('host');
    var url = req.originalUrl.replace('/','');
    const [url_part_1] = url.split('/');
    serverName = hostname + "/" + url_part_1 + "/";

    const countOccurrences = (arr, val) => arr.reduce((a, v) => (v === val ? a + 1 : a), 0);

    // Grep all content and their informations from one folder
    if ( true == fileStats.isDirectory() ){
        const getFileInfoFromFolder = (folder) => {
            const files = fs.readdirSync(folder, 'utf8');

            const response = [];

            files.forEach(function(file){
                // Only show files if they are not hidden
                if (! file.startsWith(".") && file.endsWith('_LOOP')) {

                    const results = [];
                    var  percentage_failed_tests = 0;
                    var path_to_file = folder + file;

                    var content = fs.readdirSync(path_to_file , { withFileTypes: true })
                    .filter((item) => item.isDirectory());

                    var loopcount = content.length;

                    content.forEach(function(loop_folder){
                      path_to_result = path_to_file + "/" + loop_folder.name + '/result';
                      path_to_master_output = path_to_file + "/" + loop_folder.name + '/master_output.txt';
                      path_to_sw_version = path_to_file + "/" + loop_folder.name + '/sw_version';

                      var loopcountnumber = loop_folder.name.substring(loop_folder.name.indexOf('_LOOP') + 1)
                      loopcountnumber = loopcountnumber.split('_');

                      if (loopcountnumber[1] == loopcount)
                      {
                          if (fs.existsSync(path_to_result))
                          {
                              result = fs.readlinkSync(path_to_result, 'utf8');
                              if ( result == "interrupted" && loopcount > 1)
                              {
                                  loopcount--;
                              }
                              else results.push(fs.readlinkSync(path_to_result, 'utf8'));
                          }
                          else if (! fs.existsSync(path_to_result) && fs.existsSync(path_to_master_output) && fs.existsSync(path_to_sw_version))
                          {
                              results.push("running");
                          }
                          else results.push("fatal");
                      }
                      else if (fs.existsSync(path_to_result)) {
                          results.push(fs.readlinkSync(path_to_result, 'utf8'));
                      }
                      else results.push("fatal");
                    });

                    var failed_tests =
                     countOccurrences(results, "fail")
                    +countOccurrences(results, "ignored_try_fail")
                    +countOccurrences(results, "ignored_try_execution_problems")
                    +countOccurrences(results, "ignored_try_unknown")
                    +countOccurrences(results, "unknown")
                    +countOccurrences(results, "timeout")
                    +countOccurrences(results, "setup_problems")
                    +countOccurrences(results, "unstable")
                    +countOccurrences(results, "fatal")
                    +countOccurrences(results, "execution_problems")
                    +countOccurrences(results, "interrupted")
                    +countOccurrences(results, "ignored_interrupted");
                    var passed_tests =
                     countOccurrences(results, "pass")
                    +countOccurrences(results, "expected_fail")
                    +countOccurrences(results, "ignored_warning")
                    +countOccurrences(results, "ignored_fail")
                    +countOccurrences(results, "ignored_unknown")
                    +countOccurrences(results, "disabled")
                    +countOccurrences(results, "warning")
                    +countOccurrences(results, "ignored_try_warning");


                    if (results.includes("running") && loopcount == 1)
                    {
                        result = "running_started";
                        loopcount--;
                    }
                    else if (results.includes("running") && (passed_tests == 0 || passed_tests <= failed_tests))
                    {
                        result = "running_fail";
                        if (passed_tests <=failed_tests){
                          percentage_failed_tests = Math.floor((failed_tests/loopcount)*100);
                        }
                        loopcount--;
                    }
                    else if (results.includes("running") && failed_tests == 0)
                    {
                        result = "running_pass";
                        percentage_failed_tests = Math.floor((failed_tests/loopcount)*100);
                        loopcount--;
                    }
                    else if (results.includes("running") && passed_tests >   failed_tests)
                    {
                        result = "running_warning";
                        percentage_failed_tests = Math.floor((failed_tests/loopcount)*100);
                        loopcount--;
                    }
                    else if (passed_tests == 0 || passed_tests <= failed_tests)
                    {
                        result = "fail";
                        percentage_failed_tests = Math.floor((failed_tests/loopcount)*100);
                    }
                    else if (failed_tests == 0)
                    {
                        result = "pass";
                        percentage_failed_tests = Math.floor((failed_tests/loopcount)*100);
                    }
                    else if (passed_tests > failed_tests)
                    {
                        result = "warning";
                        percentage_failed_tests = Math.floor((failed_tests/loopcount)*100);
                    }

                    var stats = fs.lstatSync(path_to_file);
                    href = './' + file + '/';

                    var mtime = moment(stats.mtime, 'Europe/Berlin');
                    mtime = mtime.format('YYYY-MM-DD HH:mm:ss');

                    response.push({file: file, href: href, loopcount:loopcount,
                      passed_tests: passed_tests, failed_tests: failed_tests, mtime: mtime,
                      result: result, percentage_failed_tests: percentage_failed_tests});
                }
            });
            // Sort list in descending order by date
            response.sort((a, b) => Date.parse(b.mtime) - Date.parse(a.mtime));
            return response;
        }
        const info = getFileInfoFromFolder(folder);
        // If test result folder is root directory, set 'previous page' button href to ../
        if ( req.path != '/' ){
          page = '../';
        } else {
          origin_url = "looptest_overview";
        }
        // Create navigation url
        folder = req.path.substr(0, req.path.lastIndexOf("/"));
        folder = '.' + folder.substr(0, folder.lastIndexOf("/"));

        // Send all data and render qa_test_result webpage
        if (serverName=='10.236.174.140/qa_test_results/'){
            res.render('looptest_overview', {
                title: 'DEV Looptest Overview', previous_page: page,
                entries: info, path_to_folder: folder, origin_url: origin_url
            });
        } else if (serverName=='10.233.50.15/qa_test_results/'){
            res.render('looptest_overview', {
                title: 'COSY Looptest Overview', previous_page: page,
                entries: info, path_to_folder: folder, origin_url: origin_url
            });
        } else {
            res.render('looptest_overview', {
                title: 'NWOT Looptest Overview', previous_page: page,
                entries: info, path_to_folder: folder, origin_url: origin_url
            });
        }
    }

    // Check if file exist, set the right mime type and open it
    if ( true == fileStats.isFile() ){
        fs.readFile(folder, function(err, data) {
            if (err) {
                res.writeHead(404);
                return res.end("File not found.");
            }
            res.setHeader("Content-Type", mime.lookup(folder));
            res.writeHead(200);
            res.end(data);
        });
    }
});

// Grep all test result informations
router.use('/', function (req, res, next) {
    var serverName = '';
    var linkPath = '';
    var extension = '';
    var page = './';
    var origin_url = '';
    var url_path = req.path;
    url_path = url_path.substring(url_path.indexOf("/") + 1);
    var docu = new RegExp("^/CI_TESTING_DOCUMENTATION/(.*?)");
    var folder = '/var/www/html/qa_test_results/' + url_path ;
    const fileStats = fs.statSync(folder.replace(/\/\s*$/, ""));
    var hostname = req.get('host');
    var url = req.originalUrl.replace('/','');
    const [url_part_1] = url.split('/');
    serverName = hostname + "/" + url_part_1 + "/";

    // Grep all content and their informations from one folder
    if ( true == fileStats.isDirectory() ){
        const getFileInfoFromFolder = (folder) => {
            const files = fs.readdirSync(folder, 'utf8');
            const response = [];
            files.forEach(function(file){
                // Only show files if they are not hidden
                if (! file.startsWith(".")) {
                    path_to_file = folder + file;
                    var stats = fs.lstatSync(path_to_file);
                    extension = '';
                    linkPath = '';
                    result = '';
                    exit_code = '';
                    href = './' + file;
                    // If target is a file, grep file ending to differentiate the mime type
                    if ( stats.isFile() ){
                        extension = path.extname(path_to_file);
                        // If file has no ending, set default to txt
                        if ( extension == '' ){
                            extension = '.txt';
                        }
                    }
                    // If target is a link, grep content informations from link path
                    if ( stats.isSymbolicLink() ){
                        extension = ".link";
                        var linkStats = fs.lstatSync(path_to_file);
                        // Check if the link is working or not
                        do {
                            linkPath =  fs.readlinkSync(path_to_file, 'utf8');
                            path_to_file = folder + linkPath;
                            try {
                                linkStats = fs.lstatSync(path_to_file);
                            } catch (ex) {
                                if (ex.code === 'ENOENT') {
                                    extension = ".linkBroken";
                                    linkPath = 'broken';
                                }
                                break;
                            }
                        } while ( linkStats.isSymbolicLink() );
                        // Check, if link target is a directory
                        if ( linkStats.isDirectory() ){
                            linkPath = linkPath ;
                            href = './' + file + '/' ;
                        }
                    }
                    if ( true == stats.isDirectory() ){
                        extension = '.folder';
                        href = './' + file + '/'
                        // Defines the result variable, which is necessary for result traffic light
                        path_to_result = path_to_file + '/result';
                        path_to_exit_code = path_to_file + '/exit_code';
                        path_to_master_output = path_to_file + '/master_output.txt';
                        path_to_sw_version = path_to_file + '/sw_version';

                        if (fs.existsSync(path_to_result)) {
                            result = fs.readlinkSync(path_to_result, 'utf8');
                        }
                        else if (! fs.existsSync(path_to_result) && fs.existsSync(path_to_master_output) && fs.existsSync(path_to_sw_version))
                        {
                            result = "running";
                        }

                        if (fs.existsSync(path_to_exit_code)) {
                            try {
                                exit_code = fs.readFileSync(path_to_exit_code, 'utf8');
                            } catch (err) {
                                console.log(err);
                            }
                        }
                        else if (! fs.existsSync(path_to_exit_code) && ! fs.existsSync(path_to_result) && fs.existsSync(path_to_master_output))
                        {
                            exit_code = "running";
                        }
                        else if (! fs.existsSync(path_to_exit_code) && fs.existsSync(path_to_result) && fs.existsSync(path_to_master_output))
                        {
                            exit_code = "fatal";
                        }
                    }
                    var mtime = moment(stats.mtime, 'Europe/Berlin');
                    mtime = mtime.format('YYYY-MM-DD HH:mm:ss');

                    response.push({ extension: extension, file: file, href: href,
                      linkPath: linkPath, mtime: mtime, result: result, exit_code: exit_code});
                }
            });
            // Sort list in descending order by date
            response.sort((a, b) => Date.parse(b.mtime) - Date.parse(a.mtime));
            return response;
        }
        const info = getFileInfoFromFolder(folder);
        // If test result folder is root directory, set 'previous page' button href to ../
        if ( req.path != '/' ){
          page = '../';
        } else {
          origin_url = "test_results";
        }

        // Create navigation url
        folder = req.path.substr(0, req.path.lastIndexOf("/"));
        folder = '.' + folder.substr(0, folder.lastIndexOf("/"));

        var reqPath = req.path;

        // Send all data and render qa_test_result webpage
        if ( docu.test(req.path) ){
            res.render('qa_test_results', {
                title: 'Keyword Documentation', previous_page: page,
                entries: info, path_to_folder: folder, origin_url: origin_url
            });
            console.log("if keyword Keyword Documentation");

        } else if (serverName.includes('10.236.174.140')){
            res.render('qa_test_results', {
                title: 'DEV Test Results', previous_page: page,
                entries: info, path_to_folder: folder, origin_url: origin_url
            });
        } else if (serverName.includes('10.233.50.15')){
            res.render('qa_test_results', {
                title: 'COSY Test Results', previous_page: page,
                entries: info, path_to_folder: folder, origin_url: origin_url, serverName: serverName, reqPath: reqPath
            });
        }
          else if (serverName.includes('10.233.50.14')){
            res.render('qa_test_results', {
                title: 'NWOT Test Results', previous_page: page,
                entries: info, path_to_folder: folder, origin_url: origin_url
            });
        }
    }

    // Check if file exist, set the right mime type and open it
    if ( true == fileStats.isFile() ){
        fs.readFile(folder, function(err, data) {
            if (err) {
                res.writeHead(404);
                return res.end("File not found.");
            }
            res.setHeader("Content-Type", mime.lookup(folder));
            res.writeHead(200);
            res.end(data);
        });
    }
});

module.exports = router;
