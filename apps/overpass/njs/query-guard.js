/*
 * Reject queries this app would never send.
 *
 * The interpreter is public and unauthenticated, and it cannot usefully be
 * made otherwise: the app is a web page with no login, so any key it carries
 * is a key every visitor can read out of the bundle. What can be checked
 * without knowing *who* is asking is *what* is being asked, and that turns out
 * to be the thing worth checking — the risk here is not somebody taking the
 * data, which is a filtered scrap of what the public mirrors hand out for
 * free, it is one query costing the machine an hour.
 *
 * So this is a grammar, not a password. Every query the app has ever sent
 * passes it; the one abusive query in the logs does not:
 *
 *     [out:json][timeout:60];node(60.10,24.70,60.35,25.20);out meta;
 *
 * Every node in greater Helsinki, no tag filter, 4 MB and 2.8 s. What marks it
 * out is not its size but its shape: a spatial filter with no tag filter in
 * front of it. The app always names what it wants before saying where.
 *
 * Checked against 4985 logged queries over five days: one rejection, and it is
 * that one. Run with WAYSIDE_QUERY_GUARD=log for a while to confirm the same
 * on your own traffic before letting it block anything — in that mode a
 * refusal is written to the error log and the query is answered anyway.
 */

/* Bodies above this never reach the interpreter. The largest real query is a
 * route polygon at 177 KB; the median is 556 bytes */
var MAX_QUERY_BYTES = 262144;

var NUM = '-?\\d+(?:\\.\\d+)?';

/* A bounding box: four numbers in brackets. `node(1)` and `way(id:5)` are not
 * this, which is why an id lookup is still allowed through */
var BBOX = '\\(\\s*' + NUM + '\\s*,\\s*' + NUM + '\\s*,\\s*' + NUM + '\\s*,\\s*' + NUM + '\\s*\\)';

/* The three ways the app says *where*. Each must be preceded by a tag filter */
var SPATIAL = new RegExp(BBOX + '|\\(\\s*around\\s*:|\\(\\s*poly\\s*:', 'g');

/* Constructs the app has never emitted, and which are how a small query is
 * turned into an expensive one: area lookups, recursion down to every member
 * node, and the output modes that run a template */
var BANNED = /\bis_in\b|\barea\s*[\[\(]|\bforeach\b|\bmake\b|\bconvert\b/i;

/* Recursion as a statement of its own — `;>;`, `;>>;`, `);<;`. Written this
 * way rather than as a bare < or > so that a comparison inside a tag filter
 * is left alone */
var RECURSE = /(?:^|;|\))\s*[<>]{1,2}\s*;/;

/* Every [out:...] setting in the query, so each can be required to be json */
var OUT_SETTING = /\[\s*out\s*:\s*([a-z]+)/gi;

/**
 * Why this query is refused, or null when it is fine.
 *
 * One reason rather than all of them: this ends up in the error log and in a
 * 403 body, and the first thing wrong with a query is enough to fix it.
 */
function refusalReason(query) {
    if (query.length > MAX_QUERY_BYTES) {
        return 'query is ' + query.length + ' bytes, over the ' + MAX_QUERY_BYTES + ' byte limit';
    }

    /* Collapse whitespace once. The app pretty-prints its queries across
     * several lines, and every rule below reads more simply on one */
    var q = query.replace(/\s+/g, ' ');

    if (q.indexOf('[out:json]') < 0) {
        return 'no [out:json] setting';
    }

    OUT_SETTING.lastIndex = 0;
    var setting;
    while ((setting = OUT_SETTING.exec(q)) !== null) {
        if (setting[1].toLowerCase() !== 'json') {
            return 'output format ' + setting[1] + ' is not allowed, only json';
        }
    }

    var banned = BANNED.exec(q);
    if (banned) {
        return 'uses ' + banned[0].trim() + ', which this app never asks for';
    }

    if (RECURSE.exec(q)) {
        return 'uses a recursion statement, which this app never asks for';
    }

    /* The rule that catches the real thing. A spatial filter says *where*; it
     * has to come after a tag filter saying *what*, or the query is asking for
     * everything in an area */
    SPATIAL.lastIndex = 0;
    var where;
    while ((where = SPATIAL.exec(q)) !== null) {
        var before = q.slice(0, where.index).replace(/\s+$/, '');
        if (before.charAt(before.length - 1) !== ']') {
            return 'spatial filter with no tag filter in front of it: '
                + q.slice(Math.max(0, where.index - 24), where.index + 40);
        }
    }

    return null;
}

/**
 * The query this request is making, whichever way it was sent.
 *
 * POST with the body in memory is how the app asks. GET with ?data= is how the
 * health check asks, and how anybody poking at it by hand will. A POST whose
 * body went to a temporary file comes back null rather than empty: it is over
 * client_body_buffer_size, so it cannot be read here, and a query that cannot
 * be read is not a query that should be forwarded unread.
 */
function queryOf(r) {
    if (r.method === 'POST') {
        var length = Number(r.headersIn['Content-Length'] || 0);
        if (length === 0) {
            return '';
        }
        if (!r.requestText) {
            return null;
        }
        return r.requestText;
    }

    var args = r.variables.args;
    if (!args) {
        return '';
    }
    var match = /(?:^|&)data=([^&]*)/.exec(args);
    if (!match) {
        return '';
    }
    try {
        return decodeURIComponent(match[1].replace(/\+/g, ' '));
    } catch (e) {
        return null;
    }
}

/**
 * The handler nginx runs in place of the interpreter, which then hands the
 * request on to it unchanged. An internal redirect keeps the method, the body
 * and the arguments, so what the interpreter sees is what the client sent.
 */
function guard(r) {
    var query = queryOf(r);
    var reason = query === null
        ? 'request body could not be read (over client_body_buffer_size)'
        : (query === '' ? null : refusalReason(query));

    if (reason === null) {
        r.internalRedirect('@wayside_interpreter');
        return;
    }

    if (r.variables.wayside_guard_mode === 'log') {
        r.error('query-guard: would refuse (' + reason + ')');
        r.internalRedirect('@wayside_interpreter');
        return;
    }

    r.error('query-guard: refused (' + reason + ')');
    r.headersOut['Content-Type'] = 'text/plain';
    r.return(403, 'This Overpass instance only answers the queries wayside.cc makes.\n'
        + 'Refused: ' + reason + '\n');
}

export default { guard };
