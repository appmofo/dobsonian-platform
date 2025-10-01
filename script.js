// Fix the event listeners at the top of your DOMContentLoaded function
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing...");
    
    // Initialize UI with default values
    updateUI();
    
    // Set up event listeners - FIX THESE:
    document.getElementById('calculate-btn').addEventListener('click', function() {
        updateUI();
    });
    
    document.getElementById('latitude').addEventListener('input', function() {
        const latitude = parseFloat(this.value);
        document.getElementById('platform-top').style.transform = `translateX(-50%) rotate(${-latitude}deg)`;
        document.getElementById('angle-label').textContent = `Latitude: ${latitude}°`;
        updateUI();
    });
    
    document.getElementById('generate-openscad').addEventListener('click', function() {
        generateOpenscad();
    });
    
    // FIX: Make sure this passes a valid template type
    document.getElementById('generate-template').addEventListener('click', function() {
        console.log('Generate Template button clicked');
        generateTemplate('tpt-svg'); // Explicitly pass a valid template type
    });
    
    document.getElementById('save-parameters').addEventListener('click', function() {
        const params = getInputValues();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(params, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "platform_parameters.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });
    
    document.getElementById('copy-btn').addEventListener('click', function() {
        const code = document.getElementById('openscad-output').textContent;
        navigator.clipboard.writeText(code).then(function() {
            const btn = document.getElementById('copy-btn');
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(function() {
                btn.textContent = originalText;
            }, 2000);
        }, function() {
            alert('Failed to copy code to clipboard');
        });
    });
    
    // Set up tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            this.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
            
            // If timber tab is selected, update timber visualizations
            if (tabId === 'timber') {
                updateTimberVisualizations();
            }
        });
    });
    
    // Set up part selection
    document.querySelectorAll('.part-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.part-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            document.getElementById('selected-part').textContent = this.textContent;
            updatePartInfo(this.getAttribute('data-part'));
        });
    });
    
    // FIX: Template buttons with proper error handling
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const templateType = this.getAttribute('data-template');
            console.log('Template button clicked:', templateType);
            if (templateType && typeof templateType === 'string') {
                generateTemplate(templateType);
            } else {
                console.error('Invalid template type:', templateType);
                alert('Error: Could not determine template type');
            }
        });
    });
    
    // Add input listeners to all input fields
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', updateUI);
    });
    
    function getInputValues() {
        return {
            rbR: parseFloat(document.getElementById('rb-r').value) || 245,
            rbZ: parseFloat(document.getElementById('rb-z').value) || 535,
            tubeLbs: parseFloat(document.getElementById('tube-lbs').value) || 24.25,
            rbLbs: parseFloat(document.getElementById('rb-lbs').value) || 25,
            eqpZ: parseFloat(document.getElementById('eqp-z').value) || 160,
            eqpH: parseFloat(document.getElementById('eqp-h').value) || 18,
            eqpLbs: parseFloat(document.getElementById('eqp-lbs').value) || 15,
            bsH: parseFloat(document.getElementById('bs-h').value) || 75,
            bsD: parseFloat(document.getElementById('bs-d').value) || 15,
            bnH: parseFloat(document.getElementById('bn-h').value) || 20,
            bnHolesD: parseFloat(document.getElementById('bn-holes-d').value) || 10,
            bnSupportH: parseFloat(document.getElementById('bn-support-h').value) || 10,
            printerX: parseFloat(document.getElementById('printer-x').value) || 235,
            timberThickness: parseFloat(document.getElementById('timber-thickness').value) || 18,
            baseWidth: parseFloat(document.getElementById('base-width').value) || 600,
            baseDepth: parseFloat(document.getElementById('base-depth').value) || 600,
            latitude: parseFloat(document.getElementById('latitude').value) || 38.12,
            lineThickness: parseFloat(document.getElementById('line-thickness').value) || 0.8,
            textSize: parseFloat(document.getElementById('text-size').value) || 5,
            showAnnotations: document.getElementById('show-annotations').value === 'true'
        };
    }
    
    function calculateResults(params) {
        const T = params.latitude;
        
        const _cog_lbs = [
            params.eqpLbs,    // eqp weight
            params.rbLbs,     // rb etc weight
            params.tubeLbs    // tube weight
        ];
        
        const _cog_z = [
            params.eqpZ + params.eqpH/2,      // eqp cog
            params.eqpZ + params.eqpH + params.rbZ/3, // rb etc cog
            params.eqpZ + params.eqpH + params.rbZ    // tube cog
        ];
        
        const cogZ = (_cog_lbs[0]*_cog_z[0] + _cog_lbs[1]*_cog_z[1] + _cog_lbs[2]*_cog_z[2]) / 
                    (_cog_lbs[0] + _cog_lbs[1] + _cog_lbs[2]);
        
        // Calculate other parameters
        const platformAngle = T;
        const bearingRadius = params.rbR * 0.58;
        
        // Calculate timber dimensions
        const platformWidth = params.baseWidth * 0.9;
        const platformDepth = params.baseDepth * 0.9;
        
        // Calculate additional parameters from the original OpenSCAD
        const bsZ = params.eqpZ - params.bsH;
        const bnY = cogZ / Math.tan(T * Math.PI/180) + params.rbR;
        const bsY = bsZ / Math.tan(T * Math.PI/180);
        const cir1_r = bnY * Math.sin(T * Math.PI/180);
        const cir1_h = cir1_r / Math.tan(T * Math.PI/180);
        const cir1_eqp_r1 = params.eqpZ / Math.cos(T * Math.PI/180);
        const cir1_eqp_r2 = cir1_r - cir1_eqp_r1;
        const cir1_eqp_x = Math.sqrt(Math.pow(cir1_r,2) - Math.pow(cir1_eqp_r2,2));
        const cir1_eqp_y = params.eqpZ * Math.tan(T * Math.PI/180);
        const B = Math.atan(cir1_eqp_y / cir1_eqp_x) * 180/Math.PI;
        
        return {
            platformAngle,
            cogZ,
            bearingRadius,
            platformWidth,
            platformDepth,
            bsZ,
            bnY,
            bsY,
            cir1_r,
            cir1_h,
            cir1_eqp_x,
            cir1_eqp_y,
            B
        };
    }
    
    function updateUI() {
        const params = getInputValues();
        const results = calculateResults(params);
        
        // Update result display
        document.getElementById('platform-angle').textContent = `${results.platformAngle.toFixed(2)}°`;
        document.getElementById('cog-z').textContent = `${results.cogZ.toFixed(1)} mm`;
        document.getElementById('bearing-radius').textContent = `${results.bearingRadius.toFixed(1)} mm`;
        document.getElementById('platform-height').textContent = `${params.eqpZ} mm`;
        document.getElementById('bearing-angle').textContent = `${results.B.toFixed(1)}°`;
        document.getElementById('platform-width').textContent = `${results.platformWidth} mm`;
        
        // Update timber dimensions
        document.getElementById('base-width-value').textContent = `${params.baseWidth} mm`;
        document.getElementById('base-depth-value').textContent = `${params.baseDepth} mm`;
        document.getElementById('base-thickness-value').textContent = `${params.timberThickness} mm`;
        document.getElementById('platform-width-value').textContent = `${results.platformWidth} mm`;
        document.getElementById('platform-depth-value').textContent = `${results.platformDepth} mm`;
        document.getElementById('platform-thickness-value').textContent = `${params.timberThickness} mm`;
        document.getElementById('bearing-holes-value').textContent = '3 (2 north, 1 south)';
        
        // Update visualization
        document.getElementById('platform-top').style.transform = `translateX(-50%) rotate(${-params.latitude}deg)`;
        document.getElementById('angle-label').textContent = `Latitude: ${params.latitude}°`;
        
        // Position CoG marker (simplified visualization)
        const cogPosition = 135 - (results.cogZ / 10);
        document.getElementById('cog-marker').style.bottom = `${cogPosition}px`;
        
        // Update timber visualizations if the timber tab is active
        if (document.getElementById('timber-tab').classList.contains('active')) {
            updateTimberVisualizations();
        }
    }
    
    function updateTimberVisualizations() {
        const baseWidth = parseFloat(document.getElementById('base-width').value) || 600;
        const baseDepth = parseFloat(document.getElementById('base-depth').value) || 600;
        const timberThickness = parseFloat(document.getElementById('timber-thickness').value) || 18;
        const platformWidth = baseWidth * 0.9;
        const platformDepth = baseDepth * 0.9;
        
        // Clear previous visualizations
        const timberBase = document.getElementById('timber-base');
        const timberPlatform = document.getElementById('timber-platform');
        
        if (timberBase) timberBase.innerHTML = '';
        if (timberPlatform) timberPlatform.innerHTML = '';
        
        // Draw base platform with dimensions
        drawTimberPart(timberBase, baseWidth, baseDepth, timberThickness, true);
        
        // Draw top platform with dimensions and bearing holes
        drawTimberPart(timberPlatform, platformWidth, platformDepth, timberThickness, false);
        
        // Add bearing holes to top platform
        addBearingHoles(timberPlatform, platformWidth, platformDepth);
    }
    
    function drawTimberPart(container, width, depth, thickness, isBase) {
        if (!container) return;
        
        // Scale factors to fit in container
        const scaleX = container.offsetWidth / width;
        const scaleY = container.offsetHeight / depth;
        const scale = Math.min(scaleX, scaleY) * 0.8;
        
        // Scaled dimensions
        const scaledWidth = width * scale;
        const scaledDepth = depth * scale;
        
        // Center the drawing
        const offsetX = (container.offsetWidth - scaledWidth) / 2;
        const offsetY = (container.offsetHeight - scaledDepth) / 2;
        
        // Draw the timber outline
        const outline = document.createElement('div');
        outline.style.position = 'absolute';
        outline.style.left = `${offsetX}px`;
        outline.style.top = `${offsetY}px`;
        outline.style.width = `${scaledWidth}px`;
        outline.style.height = `${scaledDepth}px`;
        outline.style.background = 'var(--timber)';
        outline.style.border = '2px solid #8b5a2b';
        container.appendChild(outline);
        
        // Add width dimension line
        const widthLine = document.createElement('div');
        widthLine.className = 'dimension-line-h';
        widthLine.style.left = `${offsetX}px`;
        widthLine.style.top = `${offsetY - 15}px`;
        widthLine.style.width = `${scaledWidth}px`;
        container.appendChild(widthLine);
        
        // Add width dimension text
        const widthText = document.createElement('div');
        widthText.className = 'dimension-text';
        widthText.textContent = `${width} mm`;
        widthText.style.left = `${offsetX + scaledWidth/2 - 25}px`;
        widthText.style.top = `${offsetY - 30}px`;
        container.appendChild(widthText);
        
        // Add depth dimension line
        const depthLine = document.createElement('div');
        depthLine.className = 'dimension-line-v';
        depthLine.style.left = `${offsetX - 15}px`;
        depthLine.style.top = `${offsetY}px`;
        depthLine.style.height = `${scaledDepth}px`;
        container.appendChild(depthLine);
        
        // Add depth dimension text
        const depthText = document.createElement('div');
        depthText.className = 'dimension-text';
        depthText.textContent = `${depth} mm`;
        depthText.style.left = `${offsetX - 60}px`;
        depthText.style.top = `${offsetY + scaledDepth/2 - 10}px`;
        container.appendChild(depthText);
        
        // Add thickness notation if it's the base
        if (isBase) {
            const thicknessText = document.createElement('div');
            thicknessText.className = 'dimension-text';
            thicknessText.textContent = `Thickness: ${thickness} mm`;
            thicknessText.style.left = `${offsetX + 10}px`;
            thicknessText.style.top = `${offsetY + 10}px`;
            container.appendChild(thicknessText);
        }
    }
    
    function addBearingHoles(container, width, depth) {
        if (!container) return;
        
        // Scale factors to fit in container
        const scaleX = container.offsetWidth / width;
        const scaleY = container.offsetHeight / depth;
        const scale = Math.min(scaleX, scaleY) * 0.8;
        
        // Scaled dimensions
        const scaledWidth = width * scale;
        const scaledDepth = depth * scale;
        
        // Center the drawing
        const offsetX = (container.offsetWidth - scaledWidth) / 2;
        const offsetY = (container.offsetHeight - scaledDepth) / 2;
        
        // Add north bearing holes
        const northHole1 = document.createElement('div');
        northHole1.className = 'bearing-hole';
        northHole1.style.left = `${offsetX + scaledWidth * 0.25 - 7.5}px`;
        northHole1.style.top = `${offsetY + scaledDepth * 0.2 - 7.5}px`;
        container.appendChild(northHole1);
        
        const northHole2 = document.createElement('div');
        northHole2.className = 'bearing-hole';
        northHole2.style.left = `${offsetX + scaledWidth * 0.75 - 7.5}px`;
        northHole2.style.top = `${offsetY + scaledDepth * 0.2 - 7.5}px`;
        container.appendChild(northHole2);
        
        // Add south bearing hole
        const southHole = document.createElement('div');
        southHole.className = 'bearing-hole';
        southHole.style.left = `${offsetX + scaledWidth * 0.5 - 7.5}px`;
        southHole.style.top = `${offsetY + scaledDepth * 0.8 - 7.5}px`;
        container.appendChild(southHole);
        
        // Add labels
        const northLabel = document.createElement('div');
        northLabel.className = 'dimension-text';
        northLabel.textContent = 'North Bearings';
        northLabel.style.left = `${offsetX + scaledWidth * 0.5 - 40}px`;
        northLabel.style.top = `${offsetY + scaledDepth * 0.1}px`;
        container.appendChild(northLabel);
        
        const southLabel = document.createElement('div');
        southLabel.className = 'dimension-text';
        southLabel.textContent = 'South Bearing';
        southLabel.style.left = `${offsetX + scaledWidth * 0.5 - 40}px`;
        southLabel.style.top = `${offsetY + scaledDepth * 0.7}px`;
        container.appendChild(southLabel);
    }
    
    function updatePartInfo(part) {
        // Update part information based on selection
        const partInfo = {
            'bne': { time: '4-6 hours', material: '~50g', support: 'Yes' },
            'bnw': { time: '4-6 hours', material: '~50g', support: 'Yes' },
            'tbs': { time: '2-3 hours', material: '~25g', support: 'No' },
            'bfs': { time: '3-4 hours', material: '~35g', support: 'Yes' },
            'info': { time: '1-2 hours', material: '~15g', support: 'No' }
        };
        
        document.getElementById('print-time').textContent = partInfo[part].time;
        document.getElementById('material-needed').textContent = partInfo[part].material;
        document.getElementById('support-needed').textContent = partInfo[part].support;
    }
    
   function buildTemplateScadCode(params, results, partType) {
    // For SVG output, we need 2D projection
    const is2D = true; // Force 2D for templates
    
    return `
part = "${partType}";
mode = "customizer";
printer_x = ${params.printerX};
rb_r = ${params.rbR};
rb_z = ${params.rbZ};
tube_lbs = ${params.tubeLbs};
rb_lbs = ${params.rbLbs};
latitude = ${params.latitude};
eqp_z = ${params.eqpZ};
eqp_h = ${params.eqpH};
eqp_lbs = ${params.eqpLbs};
bs_h = ${params.bsH};
bs_d = ${params.bsD};
bn_h = ${params.bnH};
bn_holes_d = ${params.bnHolesD};
bn_support_h = ${params.bnSupportH};
line_thickness = ${params.lineThickness};
text_size = ${params.textSize};
show_annotations = ${params.showAnnotations};

$fn=250;
T = latitude;

_cog_lbs = [eqp_lbs, rb_lbs, tube_lbs];
_cog_z = [eqp_z+eqp_h/2, eqp_z+eqp_h+rb_z/3, eqp_z+eqp_h+rb_z];
cog_z = (_cog_lbs[0]*_cog_z[0] + _cog_lbs[1]*_cog_z[1] + _cog_lbs[2]*_cog_z[2]) / (_cog_lbs[0] + _cog_lbs[1] + _cog_lbs[2]);

cog_y = cog_z / tan(T);
cog_hyp = cog_z / sin(T);
bs_z = eqp_z - bs_h;
bn_y = cog_y + rb_r;
bs_y = bs_z / tan(T);
cir1_r = bn_y * sin (T);
cir1_eqp_r1 = eqp_z / cos(T);
cir1_eqp_r2 = cir1_r - cir1_eqp_r1;
cir1_eqp_x = sqrt(pow(cir1_r,2) - pow(cir1_eqp_r2,2));
cir1_eqp_y = eqp_z * tan(T);
B = atan(cir1_eqp_y / cir1_eqp_x);

// Simple 2D test for SVG
if (part == "tpt") {
    // 2D platform template
    square([cir1_eqp_x * 2, bn_y - bs_y + cir1_eqp_y/2]);
    
    // Bearing holes
    translate([cir1_eqp_x * 0.25, bn_y * 0.2])
        circle(d=bs_d);
    translate([cir1_eqp_x * 1.75, bn_y * 0.2])
        circle(d=bs_d);
    translate([cir1_eqp_x, bn_y * 0.8])
        circle(d=bs_d);
        
    if (show_annotations) {
        translate([cir1_eqp_x, -10])
            text(str("Width: ", round(cir1_eqp_x * 2), "mm"), size=text_size, halign="center");
    }
} else {
    // For other parts, use projection to make them 2D
    projection(cut = true) {
        if (part == "bne") {
            rotate([0,180,0]) bearing_north_east(false);
        } else if (part == "bnw") {
            rotate([0,180,0]) bearing_north_west(false);
        } else if (part == "tbs") {
            template_bearing_south();
        } else if (part == "bfs") {
            bearing_front_south();
        } else if (part == "info") {
            information_plate();
        }
    }
}
`;
} 
function generateTemplate(templateType) {
    console.log('generateTemplate called with:', templateType);
    
    // Check if templateType is null or undefined
    if (!templateType) {
        console.error('Template type is null or undefined');
        alert('Error: No template type specified');
        return;
    }
    
    // Ensure templateType is a string
    if (typeof templateType !== 'string') {
        console.error('Template type is not a string:', typeof templateType);
        templateType = String(templateType);
    }
    
    const params = getInputValues();
    const results = calculateResults(params);
    
    // Show loading state
    const preview = document.getElementById('template-preview');
    if (preview) {
        preview.innerHTML = `
            <h3>Generating Template...</h3>
            <div class="status-message status-info">
                <div class="loading"></div>
                Generating ${templateType} template...
            </div>
        `;
    }
    
    // Generate OpenSCAD code for template
    let openscadCode;
    let partType = 'tpt'; // default
    
    // Safe string checking
    if (templateType.startsWith('tpt-')) {
        partType = 'tpt';
    } else if (templateType === 'bearing-svg') {
        partType = 'tbs';
    } else if (templateType === 'front-bearing') {
        partType = 'bfs';
    } else if (templateType === 'north-east-bearing') {
        partType = 'bne';
    } else if (templateType === 'north-west-bearing') {
        partType = 'bnw';
    } else if (templateType === 'info-plate') {
        partType = 'info';
    }
    
    openscadCode = buildTemplateScadCode(params, results, partType);
    
    // Determine output format
    let outputFormat = 'svg';
    if (templateType.endsWith('-pdf')) outputFormat = 'pdf';
    if (templateType.endsWith('-png')) outputFormat = 'png';
    
    console.log('Sending to server:', { outputFormat, templateType });
    
    // Send to server for rendering
    fetch('/generate-template', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            openscad_code: openscadCode,
            format: outputFormat,
            template_type: templateType
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Server error: ' + response.status);
        }
        return response.blob();
    })
    .then(blob => {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Set appropriate filename
        let filename = `platform_template.${outputFormat}`;
        if (templateType === 'bearing-svg') filename = 'bearing_template.svg';
        if (templateType === 'front-bearing') filename = 'front_bearing.stl';
        if (templateType === 'north-east-bearing') filename = 'north_east_bearing.stl';
        if (templateType === 'north-west-bearing') filename = 'north_west_bearing.stl';
        if (templateType === 'info-plate') filename = 'info_plate.stl';
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Update preview
        if (preview) {
            preview.innerHTML = `
                <h3>Template Generated Successfully</h3>
                <div class="status-message status-success">
                    ✓ ${filename} has been downloaded
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error generating template:', error);
        if (preview) {
            preview.innerHTML = `
                <h3>Error Generating Template</h3>
                <div class="status-message status-error">
                    ✗ Failed to generate template: ${error.message}
                </div>
            `;
        }
    });
}


    function generateOpenscad() {
        const params = getInputValues();
        const results = calculateResults(params);
        
        const openscadCode = buildTemplateScadCode(params, results, 'tpt');
        
        // Display the code
        const output = document.getElementById('openscad-output');
        if (output) {
            output.textContent = openscadCode;
        }
        
        // Show the OpenSCAD output tab
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Activate the OpenSCAD tab
        const openscadTab = document.querySelector('[data-tab="openscad"]');
        const openscadContent = document.getElementById('openscad-tab');
        
        if (openscadTab && openscadContent) {
            openscadTab.classList.add('active');
            openscadContent.classList.add('active');
        }
    }
    
    // Initialize timber visualizations if timber tab is active by default
    if (document.getElementById('timber-tab').classList.contains('active')) {
        updateTimberVisualizations();
    }

// Add these functions to your existing script.js

let currentPreviews = {};

function generateAllParts() {
    const params = getInputValues();
    
    // Show loading state
    const preview = document.getElementById('template-preview');
    preview.innerHTML = `
        <h3>Generating All Parts...</h3>
        <div class="status-message status-info">
            <div class="loading"></div>
            Creating SCAD files and templates...
        </div>
    `;
    
    // Send to server for ZIP generation
    fetch('/generate-all-parts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            parameters: params
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Server error: ' + response.status);
        }
        return response.blob();
    })
    .then(blob => {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'platform_design.zip';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Update preview
        preview.innerHTML = `
            <h3>All Parts Generated Successfully</h3>
            <div class="status-message status-success">
                ✓ platform_design.zip has been downloaded
            </div>
            <div class="download-contents">
                <h4>ZIP file contains:</h4>
                <ul>
                    <li><strong>tpt.scad</strong> - Platform Top Template</li>
                    <li><strong>bne.scad</strong> - North East Bearing</li>
                    <li><strong>bnw.scad</strong> - North West Bearing</li>
                    <li><strong>tbs.scad</strong> - Template Bearing South</li>
                    <li><strong>bfs.scad</strong> - Front South Bearing</li>
                    <li><strong>info.scad</strong> - Information Plate</li>
                    <li><strong>platform_template.svg</strong> - 2D Cutting Template</li>
                    <li><strong>README.txt</strong> - Instructions</li>
                </ul>
            </div>
        `;
    })
    .catch(error => {
        console.error('Error generating parts:', error);
        preview.innerHTML = `
            <h3>Error Generating Parts</h3>
            <div class="status-message status-error">
                ✗ ${error.message}
            </div>
        `;
    });
}

function previewPart(partType) {
    const params = getInputValues();
    
    // Show loading for this part
    const previewContainer = document.getElementById(`preview-${partType}`);
    if (previewContainer) {
        previewContainer.innerHTML = '<div class="loading-small">Generating preview...</div>';
    }
    
    // Send to server for preview generation
    fetch('/preview-part', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            parameters: params,
            part_type: partType
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Preview generation failed');
        }
        return response.blob();
    })
    .then(blob => {
        const url = URL.createObjectURL(blob);
        currentPreviews[partType] = url;
        
        const previewContainer = document.getElementById(`preview-${partType}`);
        if (previewContainer) {
            previewContainer.innerHTML = `
                <img src="${url}" alt="${partType} preview" class="part-preview-image">
                <div class="preview-actions">
                    <button onclick="downloadPart('${partType}')" class="btn-small">Download SCAD</button>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error generating preview:', error);
        const previewContainer = document.getElementById(`preview-${partType}`);
        if (previewContainer) {
            previewContainer.innerHTML = '<div class="error-small">Preview failed</div>';
        }
    });
}

function downloadPart(partType) {
    const params = getInputValues();
    // For now, we'll generate a simple SCAD file
    // In the future, you might want to call the server for the exact same code used in preview
    const openscadCode = `// ${partType.toUpperCase()} - Dobsonian Equatorial Platform
// Generated from web interface
part = "${partType}";
// Add your parameter definitions here based on params
`;
    
    const blob = new Blob([openscadCode], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${partType}.scad`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

function previewAllParts() {
    const parts = ['tpt', 'bne', 'bnw', 'bfs', 'info'];
    parts.forEach(part => previewPart(part));
}

// Make sure these functions are available globally
window.generateAllParts = generateAllParts;
window.previewAllParts = previewAllParts;
window.previewPart = previewPart;
window.downloadPart = downloadPart;
});
