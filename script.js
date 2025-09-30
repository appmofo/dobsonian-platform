document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing...");
    
    // Initialize UI with default values
    updateUI();
    
    // Set up event listeners
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
    
    document.getElementById('generate-template').addEventListener('click', function() {
        generateTemplate('tpt-svg');
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
    
    // Set up template buttons
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const templateType = this.getAttribute('data-template');
            generateTemplate(templateType);
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
    
function generateTemplate(templateType) {
    const params = getInputValues();
    const results = calculateResults(params);
    
    // Show loading state
    const preview = document.getElementById('template-preview');
    preview.innerHTML = `
        <h3>Generating Template...</h3>
        <div class="status-message status-info">
            <div class="loading"></div>
            Generating ${templateType} template...
        </div>
    `;
    
    // Generate proper OpenSCAD code
    const openscadCode = buildTemplateScadCode(params, results, templateType);
    
    // Determine output format
    let outputFormat = 'svg';
    if (templateType.endsWith('-pdf')) outputFormat = 'pdf';
    if (templateType.endsWith('-png')) outputFormat = 'png';
    
    // Send to server for rendering
    fetch('/generate-template', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            openscad_code: openscadCode,
            format: outputFormat
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.error); });
        }
        return response.blob();
    })
    .then(blob => {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `platform_template.${outputFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Update preview
        preview.innerHTML = `
            <h3>Template Generated Successfully</h3>
            <div class="status-message status-success">
                ✓ Template has been downloaded
            </div>
        `;
    })
    .catch(error => {
        console.error('Error generating template:', error);
        preview.innerHTML = `
            <h3>Error Generating Template</h3>
            <div class="status-message status-error">
                ✗ ${error.message}
            </div>
        `;
    });
}

function buildTemplateScadCode(params, results, templateType) {
    // Basic template SCAD code
    return `
// Platform Template
part = "tpt";
mode = "customizer";

// Parameters from web interface
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

$fn = 100;
T = latitude;

// Basic calculations
cog_z = ${results.cogZ.toFixed(2)};
cir1_eqp_x = ${results.cir1_eqp_x.toFixed(2)};
cir1_eqp_y = ${results.cir1_eqp_y.toFixed(2)};
B = ${results.B.toFixed(2)};
bs_y = ${results.bsY.toFixed(2)};
bn_y = ${results.bnY.toFixed(2)};

// Simple 2D template
module template_platform_top_2d() {
    // Platform outline
    difference() {
        // Main platform
        square([cir1_eqp_x * 2, bn_y - bs_y + cir1_eqp_y/2], center=false);
        
        // Bearing holes
        translate([cir1_eqp_x * 0.25, bn_y * 0.2])
            circle(d=bs_d);
        translate([cir1_eqp_x * 1.75, bn_y * 0.2])
            circle(d=bs_d);
        translate([cir1_eqp_x, bn_y * 0.8])
            circle(d=bs_d);
    }
    
    // Dimensions
    if (show_annotations) {
        // Platform dimensions
        translate([cir1_eqp_x, -10])
            text(str("Width: ", round(cir1_eqp_x * 2), "mm"), size=text_size, halign="center");
        
        translate([-20, (bn_y - bs_y)/2])
            rotate([0, 0, 90])
            text(str("Length: ", round(bn_y - bs_y + cir1_eqp_y/2), "mm"), size=text_size, halign="center");
    }
}

// Render the template
template_platform_top_2d();
`;
}
module dimension_line(p1, p2, label, offset=20) {
    color("Red") {
        line(p1, p2, thickness=line_thickness*0.5);
        mid_x = (p1[0] + p2[0]) / 2;
        mid_y = (p1[1] + p2[1]) / 2;
        dx = p2[0] - p1[0];
        dy = p2[1] - p1[1];
        length = sqrt(dx*dx + dy*dy);
        perp_x = -dy/length * offset;
        perp_y = dx/length * offset;
        translate([mid_x + perp_x, mid_y + perp_y])
            text(label, size=text_size, halign="center", valign="center");
    }
}

module template_platform_top_2d() {
    projection(cut = true) {
        // Your template_platform_top module
    }
    
    if (show_annotations) {
        // Your annotation code
        dimension_line([-cir1_eqp_x, bs_y-cir1_eqp_y/4-25], 
                      [cir1_eqp_x, bs_y-cir1_eqp_y/4-25], 
                      str("Platform Width: ", round(cir1_eqp_x*2), "mm"));
        
        // Add more annotations as needed
    }
}

// Add all other necessary modules...

if (mode == "customizer") {
    if (part == "tpt") {
        template_platform_top_2d();
    } else if (part == "bnw") {
        rotate([0,180,0]) bearing_north_west(false);
    } else if (part == "bne") {
        rotate([0,180,0]) bearing_north_east(false);
    } else if (part == "tbs") {
        template_bearing_south();
    } else if (part == "bfs") {
        bearing_front_south();
    } else if (part == "info") {
        information_plate();
    }
}`;
    }
    
    function generateTemplate(templateType) {
        const params = getInputValues();
        const results = calculateResults(params);
        
        // Show loading state
        const preview = document.getElementById('template-preview');
        preview.innerHTML = `
            <h3>Generating Template...</h3>
            <div class="status-message status-info">
                <div class="loading"></div>
                Generating ${templateType} template...
            </div>
        `;
        
        // Generate OpenSCAD code for template
        let openscadCode;
        if (templateType.startsWith('tpt-')) {
            openscadCode = buildOpenscadCode(params, results, 'tpt');
        } else if (templateType === 'bearing-svg') {
            openscadCode = buildOpenscadCode(params, results, 'tbs');
        } else {
            openscadCode = buildOpenscadCode(params, results, 'tpt');
        }
        
        // Determine output format
        let outputFormat = 'svg';
        if (templateType.endsWith('-pdf')) outputFormat = 'pdf';
        if (templateType.endsWith('-png')) outputFormat = 'png';
        
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
            if (templateType === 'alignment-svg') filename = 'alignment_guide.svg';
            
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            // Update preview
            preview.innerHTML = `
                <h3>Template Generated Successfully</h3>
                <div class="status-message status-success">
                    ✓ ${filename} has been downloaded
                </div>
                <p>Template includes:</p>
                <ul>
                    <li>Platform dimensions: ${Math.round(results.cir1_eqp_x * 2)}mm × ${Math.round(results.bnY - results.bsY + results.cir1_eqp_y/2)}mm</li>
                    <li>Bearing locations and angles</li>
                    <li>Center of gravity calculations</li>
                    <li>Construction annotations</li>
                </ul>
            `;
        })
        .catch(error => {
            console.error('Error generating template:', error);
            preview.innerHTML = `
                <h3>Error Generating Template</h3>
                <div class="status-message status-error">
                    ✗ Failed to generate template: ${error.message}
                </div>
                <p>Please try again or check server configuration.</p>
            `;
        });
    }
    
    // Initialize timber visualizations if timber tab is active by default
    if (document.getElementById('timber-tab').classList.contains('active')) {
        updateTimberVisualizations();
    }
});
