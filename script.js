const http = require('http');
const fs = require('fs');
const url = require('url');
const craigslist = require('node-craigslist');
const ebay = require('ebay-api/index.js');

const hostname = '127.0.0.1';
const port = 4000;

// run this page and get the file served in Node with `node script.js`

const server = http.createServer((req, res) => {

        console.log('URL: '+req.url.substr(1));
    if(req.url.indexOf('assets/') != -1)
    { //req.url has the pathname, check if it conatins '.js'
        console.log('URL2: '+req.url);
        fs.readFile(req.url.substr(1), function (err, data) {
            if (err) console.log(err);
            res.writeHead(200, {'Content-Type': 'text/javascript'});
            res.write(data);
            res.end();
        });
        return false;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');

    var PageLoader = new LoadThePage(res);

    // var HTML = '';//'<div>'+GETParams+'</div>';

    // Read the requested file content from file system
    // var Head = fs.readFileSync('head.html');
    // HTML += Head.toString();


    // visit https://www.npmjs.com/package/node-craigslist for documentation related to this node module
    // and how it interacts with craigslist

    // Get the search params
    var url_parts = url.parse(req.url,true);
    console.log(url_parts.query);
    var GETParams = url_parts.query;
    var City = typeof GETParams.city != 'undefined' && GETParams.city != '' ? GETParams.city : 'sacramento';
    var KeyWord = typeof GETParams.keyword != 'undefined' ? GETParams.keyword : 'Mustang';
    var CLKeyWord = KeyWord;
    if (typeof GETParams.postal != 'undefined' && GETParams.postal != '' && typeof GETParams.search_distance != 'undefined' && GETParams.search_distance != '')
    {
        CLKeyWord += '&postal='+GETParams.postal;
        CLKeyWord += '&search_distance='+GETParams.search_distance;
    }
    if (typeof GETParams.min_auto_year != 'undefined' && GETParams.min_auto_year != '') { CLKeyWord += '&min_auto_year='+GETParams.min_auto_year; }
    if (typeof GETParams.max_auto_year != 'undefined' && GETParams.max_auto_year != '') { CLKeyWord += '&max_auto_year='+GETParams.max_auto_year; }
    console.log('CLKeyWord: '+CLKeyWord);
    var CLOptions = { city: City, category: 'cta' };







    var EBParams = { categorySiteId : 6001, categoryId : 6001 };
    var EBKeyWord = KeyWord;
    if (EBKeyWord.length) { EBParams.keywords = EBKeyWord; }
    if (typeof GETParams.postal != 'undefined' && GETParams.postal != '' && typeof GETParams.search_distance != 'undefined' && GETParams.search_distance != '')
    {
        EBParams.buyerPostalCode = GETParams.postal;
        var itemFilter = [{name: 'MaxDistance', value: GETParams.search_distance}]
        EBParams.itemFilter = itemFilter;
    }
    // console.log(EBParams);
    var EBListingsHTML = '';
    var EBListings = ebay.xmlRequest({
            serviceName: 'Finding',
            opType: 'findItemsAdvanced',
            appId: 'AustinFr-carSearc-PRD-c91ebc5cc-a8e4f8a0',      // FILL IN YOUR OWN APP KEY, GET ONE HERE: https://publisher.ebaypartnernetwork.com/PublisherToolsAPI
            params: EBParams,
            reqOptions: { siteId: 100 },
            sandbox: true,
            parser: ebay.parseResponseJson    // (default)
        },
        // gets all the items together in a merged array
        function itemsCallback(error, itemsResponse) {
            if (error) throw error;

            if (itemsResponse.searchResult.$.count == '0')
            {
                PageLoader.Loadem('');
                return false;
            }
            var items = itemsResponse.searchResult.item;

            // console.log('Found', items.length, 'items');

            for (var i = 0; i < items.length; i++) {
                var Item = items[i];
                var Title = Item.title;
                var Year = GetTheYear(Title);
                var Start = new Date(Item.listingInfo.startTime);
                var StartDate = Start.getFullYear()+'-'+(Start.getMonth()+1)+'-'+Start.getDate()+' '+Start.getHours()+':'+Start.getMinutes()+':'+Start.getSeconds();
                var Loc = Item.location.split(',');
                var City = Loc.length > 2 ? Loc[0] : '';
                var State = Loc.length > 2 ? Loc[1] : '';
                //console.log('=======================');
                //console.log(Item);
                EBListingsHTML += '<tr>';
                EBListingsHTML += '<td><a href="'+Item.viewItemURL+'">'+Title+'</a></td>';
                EBListingsHTML += '<td>'+Item.sellingStatus.currentPrice.amount+'</td>';
                EBListingsHTML += '<td>'+Year+'</td>';
                EBListingsHTML += '<td>'+City+'</td>';
                EBListingsHTML += '<td>'+State+'</td>';
                EBListingsHTML += '<td>'+StartDate+'</td>';
                EBListingsHTML += '<td>eBay</td>';
                EBListingsHTML += '</tr>';
            }

            PageLoader.Loadem(EBListingsHTML);
        }
    );






    var client = new craigslist.Client();

    var CLListings = client
    .search(CLOptions, CLKeyWord)
    .catch(function (err) {
        console.error(err);
        return '<p>No results found</p>';
    });


    Promise.all([CLListings, EBListings]).then(function (CLListings, EBListings) {

        var HTML = '';//'<div>'+GETParams+'</div>';

        CLListings[0].forEach(function (Listing, k) {
            if (!k)
            {
                console.log('Listing: ', Listing);
                ListingDetails = client.details(Listing).then(function (Detail) { console.log('Details: ', Detail); });
            }
            var Title = Listing.title;
            var Year = GetTheYear(Title);
            var aListingURL = Listing.url.split('//');
            var ListingURL = aListingURL.pop();
            HTML += '<tr>';
            HTML += '<td><a href="//' + ListingURL + '">' + Title + '</a></td>';
            HTML += '<td>' + Listing.price.replace('$', '') + '</td>';
            HTML += '<td>'+Year+'</td>';
            HTML += '<td>'+Listing.location.replace('(', '').replace(')', '')+'</td>';
            HTML += '<td></td>';
            HTML += '<td>' + Listing.date + '</td>';
            HTML += '<td>Craigslist</td>';
            HTML += '</tr>';
        });

        PageLoader.Loadem(HTML);
    });
});

//server running at 127.0.0.1:3000
// server.listen(port, hostname, () => {
//     console.log(`Server running at http://${hostname}:${port}/`);
// });
server.listen(process.env.PORT);

function LoadThePage (res)
{
    var SELF = this;
    this.NumSiteReady = 0;
    this.Listings = [];

    this.Loadem = function (Listings)
    {
        SELF.Listings[SELF.NumSiteReady] = Listings;
        SELF.NumSiteReady++;
        if (SELF.NumSiteReady == 2) { SELF.LoadIt(); }
    };

    this.LoadIt = function ()
    {
        var HTML = '';

        // Read the requested file content from file system
        var Head = fs.readFileSync('head.html');
        HTML += Head.toString();

        // Insert the tr's
        HTML += SELF.Listings.join('');

        // Read the requested file content from file system
        var Foot = fs.readFileSync('foot.html');
        HTML += Foot.toString();

        // Load the page
        res.write(HTML);
        res.end('\n');
    };
}

function GetTheYear (Title)
{
    var aTitle = Title.split(' ');
    var Year = '';
    var FirstWordIsYear = parseInt(aTitle[0]);
    if (FirstWordIsYear)
    {
        if (aTitle[0].length == 4) { Year = aTitle[0]; }
        if (aTitle[0].length == 2) { Year = (FirstWordIsYear > 30 ? '19' : '20')+aTitle[0]; }
    }
    return Year;
}
