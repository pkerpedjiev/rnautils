var number_sort = function(a,b) { return a - b; };

function generateUUID(){                                                                                        
    /* Stack Overflow:                                                                                          
     * http://stackoverflow.com/a/8809472/899470                                                                
     */
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);                                                         
    });                                                                                                         

    return uuid;
}

function isNormalInteger(str) {
    //http://stackoverflow.com/a/10834843/899470
    return /^\+?(0|[1-9]\d*)$/.test(str);
}

if(typeof(String.prototype.trim) === "undefined")
    {
        String.prototype.trim = function() 
        {
            return String(this).replace(/^\s+|\s+$/g, '');
        };
    }

function ColorScheme(colorsText) {
    var self = this;
    self.colorsText = colorsText;

    self.parseRange = function(range_text) {
        //parse a number range such as 1-10 or 3,7,9 or just 7
        var parts = range_text.split(',')
        var nums = [];

        for (var i = 0; i < parts.length; i++) {
            //could be 1 or 10-11  or something like that
            var parts1 = parts[i].split('-');

            if (parts1.length == 1)
                nums.push(parseInt(parts1[0]));
            else if (parts1.length == 2) {
                var from = parseInt(parts1[0]);
                var to = parseInt(parts1[1]);

                // add each number in this range
                for (var j = from; j <= to; j++) 
                    nums.push(j)
            } else {
                console.log('Malformed range (too many dashes):', range_text);
            }
        }

        return nums;
    }

    self.parseColorText = function(color_text) {
        /* Parse the text of an RNA color string. Instructions and description
         * of the format are given below.
         *
         * The return is a json double dictionary indexed first by the 
         * molecule name, then by the nucleotide. This is then applied
         * by force.js to the RNAs it is displaying. When no molecule
         * name is specified, the color is applied to all molecules*/
        var lines = color_text.split('\n');
        var curr_molecule = '';
        var counter = 1;
        var colors_json = {color_values: {'':{}}, range:['white', 'steelblue']};
        var domain_values = [];


        for (var i = 0; i < lines.length; i++) {

            if (lines[i][0] == '>') {
                // new molecule
                curr_molecule = lines[i].trim().slice(1);
                counter = 1;

                colors_json.color_values[curr_molecule] = {};
                continue;
            }

            words = lines[i].trim().split(/[\s]+/);

            for (var j = 0; j < words.length; j++) {
                if (isNaN(words[j])) {
                    if (words[j].search("range") === 0) {
                        //there's a color scale in this entry
                        parts = words[j].split('=');
                        parts_right = parts[1].split(':')
                        colors_json.range = [parts_right[0], parts_right[1]];
                        continue;
                    }

                    if (words[j].search("domain") == 0) {
                        //there's a color scale in this entry
                        parts = words[j].split('=');
                        parts_right = parts[1].split(':')
                        colors_json.domain = [parts_right[0], parts_right[1]];
                        continue;
                    }

                    // it's not a number, should be a combination 
                    // of a number (nucleotide #) and a color
                    parts = words[j].split(':');
                    nums = self.parseRange(parts[0]);
                    color = parts[1]

                    for (var k = 0; k < nums.length; k++) {
                        if (isNaN(color)) {
                            colors_json.color_values[curr_molecule][nums[k]] = color;
                        } else {
                            colors_json.color_values[curr_molecule][nums[k]] = +color;
                            domain_values.push(Number(color));
                        }
                    }
                } else {
                    //it's a number, so we add it to the list of values
                    //seen for this molecule
                    colors_json.color_values[curr_molecule][counter] = Number(words[j]);
                    counter += 1;

                    domain_values.push(Number(words[j]));
                }
            }
        }

        if (!('domain' in colors_json))
            colors_json.domain = [Math.min.apply(null, domain_values), Math.max.apply(null, domain_values)];

        self.colors_json = colors_json;

        return self;
    };

    self.normalizeColors = function() {
        /* 
         * Normalize the passed in values so that they range from
         * 0 to 1
         */
        var value;

        for (var molecule_name in self.colors_json) {
            var min_num = Number.MAX_VALUE;
            var max_num = Number.MIN_VALUE;

            // iterate once to find the min and max values;
            for (var resnum in self.colors_json.color_values[molecule_name]) {
                value = self.colors_json.color_values[molecule_name][resnum];
                if (typeof value == 'number') {
                    if (value < min_num)
                        min_num = value;
                    if (value > max_num)
                        max_num = value;
                }
            }

            // iterate again to normalize
            for (resnum in self.colors_json.color_values[molecule_name]) {
                value = self.colors_json.color_values[molecule_name][resnum];
                if (typeof value == 'number') {
                    self.colors_json.color_values[molecule_name][resnum] = (value - min_num ) / (max_num - min_num);
                }
            }
        }

        return self;
    };

    self.parseColorText(self.colorsText);
}

function ProteinGraph(struct_name, size, uid) {
    var self = this;

    self.type = 'protein';
    self.size = size;
    self.nodes = [{'name': 'P',
                   'num': 1,
                   'radius': 3 *  Math.sqrt(size),
                   'rna': self,
                   'node_type': 'protein',
                   'struct_name': struct_name,
                   'elem_type': 'p',
                   'size': size,
                   'uid': generateUUID()}];

    self.links = [];
    self.uid = generateUUID();

    self.addUids = function(uids) {
        for (var i = 0; i < uids.length; i++)
            self.nodes[i].uid = uids[i];

        return self;
    };

    self.get_uids = function() {
        /* Get the positions of each node so that they
         * can be passed to elementsToJson later
         */
        uids = [];
        for (var i = 0; i < self.dotbracket.length; i++)
            uids.push(self.nodes[i].uid);

        return uids;
    };

}

function RNAGraph(seq, dotbracket, struct_name) {
    var self = this;

    self.type = 'rna';

    if (arguments.length == 0) {
        self.seq = '';
        self.dotbracket = '';
        self.struct_name = '';
    } else {
        self.seq = seq;
        self.dotbracket = dotbracket;  //i.e. ..((..))..
        self.struct_name = struct_name;
    }

    self.circular = false;

    if (self.dotbracket.length > 0 && self.dotbracket[self.dotbracket.length-1] == '*') {
        //circular RNA
        self.dotbracket = self.dotbracket.slice(0, self.dotbracket.length-1);
        self.circular = true;
    }

    self.uid = generateUUID();
    self.rnaLength = self.dotbracket.length;

    self.elements = [];            //store the elements and the 
                                   //nucleotides they contain
    self.pseudoknotPairs = [];
    self.nucs_to_nodes = {};

    self.addUids = function(uids) {
        for (var i = 0; i < uids.length; i++)
            self.nodes[i].uid = uids[i];

        return self;
    };

    self.computePairtable = function() {
        self.pairtable = rnaUtilities.dotbracketToPairtable(self.dotbracket);
    };

    self.computePairtable();

    self.addPositions = function(node_type, positions) {
        label_nodes = self.nodes.filter(function(d) { return d.node_type == node_type; });

        for  (var i = 0; i < label_nodes.length; i++) {
            label_nodes[i].x = positions[i][0];
            label_nodes[i].px = positions[i][0];
            label_nodes[i].y = positions[i][1];
            label_nodes[i].py = positions[i][1];
        }

        return self;
    };

    self.get_positions = function(node_type) {
        positions = [];
        nucleotide_nodes = self.nodes.filter(function(d) { return d.node_type == node_type; });

        for (var i = 0; i < nucleotide_nodes.length; i++)
            positions.push([nucleotide_nodes[i].x, nucleotide_nodes[i].y]);

        return positions;
    };

    self.get_uids = function() {
        /* Get the positions of each node so that they
         * can be passed to elementsToJson later
         */
        uids = [];
        for (var i = 0; i < self.dotbracket.length; i++)
            uids.push(self.nodes[i].uid);

        return uids;
    };

    self.reinforceStems = function() {
        pt = self.pairtable;
        relevant_elements = elements.filter( function(d) {
            return d[0] == 's' && d[2].length >= 4;
        });

        for (var i = 0; i < relevant_elements.length; i++) {
            all_nucs = relevant_elements[i][2];
            nucs = all_nucs.slice(0, all_nucs.length / 2);

            for (var j = 0; j < nucs.length-1; j++) {
                self.add_fake_node([nucs[j], nucs[j+1], pt[nucs[j+1]], pt[nucs[j]]]);
            }
        }

        return self;    
    };

    self.reinforceLoops = function() {
        /* 
         * Add a set of fake nodes to enforce the structure
         */
        var filter_nucs = function(d) { 
            return d !== 0 && d <= self.dotbracket.length;
        };

        for (i=0; i < self.elements.length; i++) {
            if (self.elements[i][0] == 's' || self.elements[i][0] == 'e')
                continue;

            var nucs = self.elements[i][2].filter(filter_nucs);

            self.add_fake_node(nucs);
        }

        return self;
    };

    self.add_fake_node = function(nucs) {
        var linkLength = 18; //make sure this is consistent with the value in force.js
        var nodeWidth = 6;
        var angle = (3.1415 * 2) / (2 * nucs.length);
        var radius =  linkLength / (2 * Math.tan(angle));

        new_node = {'name': '',
                         'num': -1,
                         //'radius': 18 * radius -6,
                         'radius': radius,
                         'rna': self,
                         'node_type': 'middle',
                         'elem_type': 'f',
                         'nucs': nucs,
                         'uid': generateUUID() };
        self.nodes.push(new_node);

        new_x = 0;
        new_y = 0;
        coords_counted = 0;

        angle = (nucs.length - 2) * 3.14159 / (2 * nucs.length);
        radius = 0.5 / Math.cos(angle);

        for (j = 0; j < nucs.length; j++) {
            if (nucs[j] === 0 || nucs[j] > self.dotbracket.length)
                continue;

            //link to the center node
            self.links.push({'source': self.nodes[nucs[j] - 1],
                             'target': self.nodes[self.nodes.length-1],
                             'link_type': 'fake',
                             'value': radius,
                             'uid': generateUUID() });

            if (nucs.length > 4) {
                //link across the loop
                self.links.push({'source': self.nodes[nucs[j] - 1],
                                 'target': self.nodes[nucs[(j + Math.floor(nucs.length / 2)) % nucs.length] - 1],
                                 'link_type': 'fake',
                                 'value': radius * 2,
                                 'uid': generateUUID() });
            }

            ia = ((nucs.length - 2) * 3.14159) / nucs.length;
            c = 2 * Math.cos(3.14159 / 2 - ia / 2);
            //link to over-neighbor
            self.links.push({'source': self.nodes[nucs[j] - 1],
                             'target': self.nodes[nucs[(j + 2) % nucs.length] - 1],
                             'link_type': 'fake',
                             'value': c});

            // calculate the mean of the coordinats in this loop
            // and place the fake node there
            from_node = self.nodes[nucs[j]-1];
            if ('x' in from_node) {
                new_x += from_node.x;
                new_y += from_node.y;

                coords_counted += 1;
            }
        }

        if (coords_counted > 0) {
            // the nucleotides had set positions so we can calculate the position
            // of the fake node
            new_node.x = new_x / coords_counted;
            new_node.y = new_y / coords_counted;
            new_node.px = new_node.x;
            new_node.py = new_node.y;
        }

        return self;
    };

    self.connectFakeNodes = function() {
        var linkLength = 18;

        // We want to be able to connect all of the fake nodes
        // and create a structure consisting of just them
        var filter_out_non_fake_nodes = function(d) {
            return d.node_type == 'middle';
        }

        var nucs_to_nodes = {};
        var fake_nodes = self.nodes.filter(filter_out_non_fake_nodes);
        var linked = new Set();

        // initialize the nucleotides to nodes
        for (var i = 1; i <= self.rnaLength; i++) 
            nucs_to_nodes[i] = [];

        for (i = 0; i < fake_nodes.length; i++) {
            var this_node = fake_nodes[i];

            // each fake node represents a certain set of nucleotdies (this_node.nucs)
            for (var j = 0; j < this_node.nucs.length; j++) {
                var this_nuc = this_node.nucs[j];

                // check to see if this nucleotide has been seen in another fake node
                // if it has, then we add a link between the two nodes
                for (var k = 0; k < nucs_to_nodes[this_nuc].length; k++) {
                    if (linked.has(JSON.stringify([nucs_to_nodes[this_nuc][k].uid, this_node.uid].sort())))
                        continue; //already linked

                    var distance = nucs_to_nodes[this_nuc][k].radius + this_node.radius;

                    self.links.push({"source": nucs_to_nodes[this_nuc][k],
                                      "target": this_node,
                                      "value": distance / linkLength,
                                      "link_type": "fake_fake"});

                    // note that we've already seen this link
                    linked.add(JSON.stringify([nucs_to_nodes[this_nuc][k].uid, this_node.uid].sort()));
                }

                nucs_to_nodes[this_nuc].push(this_node);
            }
        }

        return self;

    };

    self.elementsToJson = function() {
        /* Convert a set of secondary structure elements to a json
         * representation of the graph that can be used with d3's
         * force-directed layout to generate a visualization of 
         * the structure.
         */
        pt = self.pairtable;
        elements = self.elements;

        self.nodes = [];
        self.links = [];

        //create a reverse lookup so we can find out the type
        //of element that a node is part of
        elem_types = {};

        //sort so that we count stems last
        self.elements.sort();

        for (var i = 0; i < self.elements.length; i++) {
            nucs = self.elements[i][2];
            for (j = 0; j < nucs.length; j++) {
                elem_types[nucs[j]] = self.elements[i][0];
            }
        }

        for (i = 1; i <= pt[0]; i++) {
            //create a node for each nucleotide
            self.nodes.push({'name': self.seq[i-1],
                             'num': i,
                             'radius': 6,
                             'rna': self,
                             'node_type': 'nucleotide',
                             'struct_name': self.struct_name,
                             'elem_type': elem_types[i],
                             'uid': generateUUID() });
        }


        for (i = 1; i <= pt[0]; i++) {

            if (pt[i] !== 0) {
                // base-pair links
                self.links.push({'source': self.nodes[i-1],
                                 'target': self.nodes[pt[i]-1],
                                 'link_type': 'basepair',
                                 'value': 1,
                                 'uid': generateUUID() });
            }

            if (i > 1) {
                // backbone links
                self.links.push({'source': self.nodes[i-2],
                                 'target': self.nodes[i-1],
                                 'link_type': 'backbone',
                                 'value': 1,
                                 'uid': generateUUID() });
            }
        }

        //add the pseudoknot links
        for (i = 0; i < self.pseudoknotPairs.length; i++) {
                self.links.push({'source': self.nodes[self.pseudoknotPairs[i][0]-1],
                                 'target': self.nodes[self.pseudoknotPairs[i][1]-1],
                                 'link_type': 'pseudoknot',
                                 'value': 1,
                                 'uid': generateUUID() });
        }

        if (self.circular) {
            self.links.push({'source': self.nodes[0],
                            'target': self.nodes[self.rnaLength-1],
                            'link_type': 'backbone',
                            'value': 1,
                            'uid': generateUUID() });

        }

        return self;
    };

    self.pt_to_elements = function(pt, level, i, j) {
        /* Convert a pair table to a list of secondary structure 
         * elements:
         *
         * [['s',1,[2,3]]
         *
         * The 's' indicates that an element can be a stem. It can also be
         * an interior loop ('i'), a hairpin loop ('h') or a multiloop ('m')
         *
         * The second number (1 in this case) indicates the depth or
         * how many base pairs have to be broken to get to this element.
         *
         * Finally, there is the list of nucleotides which are part of
         * of this element.
         */
        var elements = [];
        var u5 = [i-1];
        var u3 = [j+1];

        if (i > j)
            return [];
            
            //iterate over the unpaired regions on either side
            //this is either 5' and 3' unpaired if level == 0
            //or an interior loop or a multiloop
            for (; pt[i] === 0; i++) { u5.push(i); }
            for (; pt[j] === 0; j--) { u3.push(j); }

            if (i > j) {
                //hairpin loop or one large unpaired molecule
                u5.push(i);
                if (level === 0)
                    return [['e',level, u5.sort(number_sort)]];
                else
                    return [['h',level, u5.sort(number_sort)]];
            }

            if (pt[i] != j) {
                //multiloop
                var m = u5;
                var k = i;

                // the nucleotide before and the starting nucleotide
                m.push(k);
                while (k <= j) {
                    // recurse into a stem
                    elements = elements.concat(self.pt_to_elements(pt, level, k, pt[k]));

                    // add the nucleotides between stems
                    m.push(pt[k]);
                    k = pt[k] + 1;
                    for (; pt[k] === 0 && k <= j; k++) { m.push(k);}
                    m.push(k);
                }
                m.pop();
                m = m.concat(u3);
                
                if (m.length > 0) {
                    if (level === 0)
                        elements.push(['e', level, m.sort(number_sort)]);
                    else
                        elements.push(['m', level, m.sort(number_sort)]);
                }
                
                return elements;
            }

            if (pt[i] === j) {
                //interior loop
                u5.push(i);
                u3.push(j);

                combined = u5.concat(u3);
                if (combined.length > 4) {
                    if (level === 0)
                        elements.push(['e',level, u5.concat(u3).sort(number_sort)]);
                    else
                        elements.push(['i',level, u5.concat(u3).sort(number_sort)]);
                }
            } 

            var s = [];
            //go through the stem
            while (pt[i] === j && i < j) {
                //one stem
                s.push(i);
                s.push(j);

                i += 1;
                j -= 1;

                level += 1;
            }

            u5 = [i-1];
            u3 = [j+1];
            elements.push(['s', level, s.sort(number_sort)]);

        return elements.concat(self.pt_to_elements(pt, level, i, j));
    };

    self.addLabels = function(labelInterval) {
        if (arguments.length  === 0)
            labelInterval = 10;

        if (labelInterval === 0)
            return self;

        if (labelInterval <= 0) 
            console.log('The label interval entered in invalid:', labelInterval);

        for (i = 1; i <= pt[0]; i++) {
            // add labels
            if (i % labelInterval === 0) {
                //create a node for each label
                var newX, newY;

                if (self.pairtable[i] !== 0) {
                    // if this base is paired, position the label opposite the base pair
                    newX = self.nodes[i-1].x + (self.nodes[i-1].x - self.nodes[self.pairtable[i] - 1].x);
                    newY = self.nodes[i-1].y + (self.nodes[i-1].y - self.nodes[self.pairtable[i] - 1].y);
                } else {
                    // the label is on a nucleotide in a loop

                    if (self.rnaLength == 1) {
                        // only one nucleotide so we just position the label adjacent to it
                        newX = self.nodes[0].x + 15;
                        newY = self.nodes[0].y + 0;
                    } else {
                        if (i === 0)
                            prevNode = self.nodes[i-1];
                        else
                            prevNode = self.nodes[i-2];

                        if (i == self.rnaLength)
                            nextNode = self.nodes[i-1];
                        else
                            nextNode = self.nodes[i];

                        thisNode = self.nodes[i-1];

                        nextVec = [nextNode.x - thisNode.x, nextNode.y - thisNode.y];
                        prevVec = [prevNode.x - thisNode.x, prevNode.y - thisNode.y];

                        combinedVec = [nextVec[0] + prevVec[0], nextVec[1] + prevVec[1]];
                        vecLength = Math.sqrt(combinedVec[0] * combinedVec[0] + combinedVec[1] * combinedVec[1]);
                        normedVec = [combinedVec[0] / vecLength, combinedVec[1] / vecLength];
                        offsetVec = [-15 * normedVec[0], -15 * normedVec[1]];

                        console.log(i, 'prevNode.num', prevNode.num, 'nextNode.num', nextNode.num);
                        console.log(i, 'prevVec', prevVec , 'nextVec', nextVec, 'combinedVec', combinedVec);
                        console.log(i, 'normedVec', normedVec, "offsetVec", offsetVec );

                        newX = self.nodes[i-1].x + offsetVec[0];
                        newY = self.nodes[i-1].y + offsetVec[1];
                    }
                }

                new_node = {'name': i,
                                 'num': -1,
                                 'radius': 6,
                                 'rna': self,
                                 'node_type': 'label',
                                 'struct_name': self.struct_name,
                                 'elem_type': 'l',
                                 'x': newX,
                                 'y': newY,
                                 'px': newX,
                                 'py': newY,
                                 'uid': generateUUID() };
                new_link = {'source': self.nodes[i-1],
                            'target': new_node,
                            'value': 1,
                            'link_type': 'label_link',
                            'uid': generateUUID() };

                self.nodes.push(new_node);
                self.links.push(new_link);
            }
        }

        return self;
    };

    self.recalculateElements = function() {
        self.removePseudoknots();
        self.elements = self.pt_to_elements(self.pairtable, 0, 1, self.dotbracket.length);

        if (self.circular) {
            //check to see if the external loop is a hairpin or a multiloop
            external_loop = self.elements.filter(function(d) { if (d[0] == 'e') return true; });

            if (external_loop.length > 0) {
                eloop = external_loop[0];
                nucs = eloop[2].sort(number_sort);

                prev = nucs[0];
                hloop = true;
                num_greater = 0;
                for (var i = 1; i < nucs.length; i++) {
                    if (nucs[i] - prev > 1) {
                        num_greater += 1;
                    }
                    prev = nucs[i];
                }

                if (num_greater == 1) {
                    eloop[0] = 'h';
                } else if (num_greater == 2) {
                    eloop[0] = 'i';
                } else {
                    eloop[0] = 'm';
                }
            }
        }

        return self;
    };

    self.removePseudoknots = function() {
        if (self.pairtable.length > 1)
            self.pseudoknotPairs = rnaUtilities.removePseudoknotsFromPairtable(self.pairtable);
        else
            self.pseudoknotPairs = [];

        return self;
    };

    self.addPseudoknots = function() {
        /* Add all of the pseudoknot pairs which are stored outside
         * of the pairtable back to the pairtable
         */
        var pt = self.pairtable;
        var pseudoknotPairs = self.pseudoknotPairs;

        for (i = 0; i < pseudoknotPairs.length; i++) {
            pt[pseudoknotPairs[i][0]] = pseudoknotPairs[i][1];
            pt[pseudoknotPairs[i][1]] = pseudoknotPairs[i][0];
        }

        self.pseudoknotPairs = [];
        return self;
    };

    if (self.rnaLength > 0)
        self.recalculateElements();
}

molecules_to_json = function(molecules_json) {
    /* Convert a list of RNA and protein molecules to a list of RNAGraph
     * ProteinGraph and extraLinks structure */

    var nodes = {}; //index the nodes by uid
    var graphs = [];
    var extraLinks = [];


    // Create the graphs for each molecule
    for (var i = 0; i < molecules_json.molecules.length; i++) {
        var molecule = molecules_json.molecules[i];

        if (molecule.type == 'rna') {
            rg = new RNAGraph(molecule.seq, molecule.ss, molecule.header);
            rg.elementsToJson()
            .addPositions('nucleotide', molecule.positions)
            .addLabels()
            .reinforceStems()
            .reinforceLoops();

            
        } else if (molecule.type == 'protein') {
            rg = new ProteinGraph(molecule.header, molecule.size);

        }

        rg.addUids(molecule.uids);

        for (var j = 0; j < rg.nodes.length; j++) {
            nodes[rg.nodes[j].uid] = rg.nodes[j];
        }

        graphs.push(rg);
    }

    //Add the extra links
    for (i = 0; i < molecules_json.extra_links.length; i++) {
        link = molecules_json.extra_links[i];
        
        link.source = nodes[link.source];
        link.target = nodes[link.target];
        link.uid = generateUUID();

        extraLinks.push(link);
    }

    return {"graphs": graphs, "extraLinks": extraLinks};
}
