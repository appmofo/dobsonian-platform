import os
import zipfile
import tempfile
from flask import Flask, request, jsonify, send_file
import subprocess
import threading
from datetime import datetime

app = Flask(__name__)

# Your complete OpenSCAD code as a template string
OPENSCAD_TEMPLATE = """
part = "{part}";
mode = "customizer";
printer_x = {printer_x};
rb_r = {rb_r};
rb_z = {rb_z};
tube_lbs = {tube_lbs};
rb_lbs = {rb_lbs};
latitude = {latitude};
eqp_z = {eqp_z};
eqp_h = {eqp_h};
eqp_lbs = {eqp_lbs};
bs_h = {bs_h};
bs_d = {bs_d};
bn_h = {bn_h};
bn_holes_d = {bn_holes_d};
bn_support_h = {bn_support_h};
line_thickness = {line_thickness};
text_size = {text_size};
show_annotations = {show_annotations};

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

module line(p1, p2, thickness=line_thickness) {
    hull() {
        translate(p1) circle(d=thickness);
        translate(p2) circle(d=thickness);
    }
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

module angle_dimension(center, radius, start_angle, end_angle, label) {
    color("Blue") {
        for(a = [start_angle:2:end_angle]) {
            x1 = center[0] + radius * cos(a);
            y1 = center[1] + radius * sin(a);
            x2 = center[0] + radius * cos(a+2);
            y2 = center[1] + radius * sin(a+2);
            line([x1, y1], [x2, y2], line_thickness*0.5);
        }
        mid_angle = (start_angle + end_angle) / 2;
        label_x = center[0] + (radius + 25) * cos(mid_angle);
        label_y = center[1] + (radius + 25) * sin(mid_angle);
        translate([label_x, label_y])
            text(label, size=text_size, halign="center", valign="center");
    }
}

module coordinate_point(x, y, label) {
    color("Green") {
        translate([x, y]) circle(d=3);
        translate([x + 5, y + 5]) 
            text(str(label, ": (", round(x), ",", round(y), ")"), size=text_size-1, halign="left");
    }
}

module template_platform_top(h=1) {
    z=eqp_z-h;

    translate([0,0,-z])
    difference()
    {
        intersection()
        {
            translate([-cir1_eqp_x,bs_y-cir1_eqp_y/4,z])
            cube([cir1_eqp_x*2,bn_y-bs_y+cir1_eqp_y/2,h]);
            
            union() 
            {
                translate([0,cog_y,z])
                sphere(d=bs_d*5);
                
                bearing_north(false);
                
                difference()
                {
                    bearing_south(false,d=bs_d*2);
                    bearing_south(false,d=bs_d);
                }
                
                translate([0,bs_y+(cog_y-bs_y)/2,z])
                rotate([90,0,0])
                cube([bs_d,bs_d,cog_y-bs_y-bs_d],center=true);

                translate([0,cog_y,z])
                rotate([0,0,(B-90)/1.5])
                translate([0,(bn_y-bs_y)/4,0])
                rotate([90,0,0])
                cube([bs_d,bs_d,(bn_y-bs_y)/2],center=true);
                
                translate([0,cog_y,z])
                rotate([0,0,-(B-90)/1.5])
                translate([0,(bn_y-bs_y)/4,0])
                rotate([90,0,0])
                cube([bs_d,bs_d,(bn_y-bs_y)/2],center=true);
            }
        }
        
        bearing_north_east_holes();
        mirror([1,0,0])bearing_north_east_holes();
    }
}

module template_platform_top_2d() {
    projection(cut = true) {
        template_platform_top(h=1);
    }
    
    if (show_annotations) {
        color("Red") {
            dimension_line([-cir1_eqp_x, bs_y-cir1_eqp_y/4-25], 
                          [cir1_eqp_x, bs_y-cir1_eqp_y/4-25], 
                          str("Platform Width: ", round(cir1_eqp_x*2), "mm"));
            
            dimension_line([cir1_eqp_x+30, bs_y-cir1_eqp_y/4], 
                          [cir1_eqp_x+30, bn_y+cir1_eqp_y/2], 
                          str("Platform Length: ", round(bn_y-bs_y+cir1_eqp_y/2), "mm"));
            
            dimension_line([-cir1_eqp_x-30, bs_y], 
                          [-cir1_eqp_x-30, bn_y], 
                          str("South-North: ", round(bn_y-bs_y), "mm"));
            
            dimension_line([40, bs_y], [40, cog_y], 
                          str("South-Center: ", round(cog_y-bs_y), "mm"));
            
            dimension_line([-40, cog_y], [-40, bn_y], 
                          str("Center-North: ", round(bn_y-cog_y), "mm"));
            
            dimension_line([cir1_eqp_x/2, bn_y-20], 
                          [-cir1_eqp_x/2, bn_y-20], 
                          str("North Width: ", round(cir1_eqp_x), "mm"));
        }
        
        color("Blue") {
            angle_dimension([0, cog_y], 60, -90, -90+T, str("Latitude: ", T, "°"));
            angle_dimension([0, cog_y], 45, -90, -90+B, str("Bearing Angle: ", round(B,1), "°"));
        }
        
        color("Green") {
            coordinate_point(0, bs_y, "South Bearing");
            coordinate_point(0, cog_y, "Center");
            coordinate_point(0, bn_y, "North Line");
            coordinate_point(cir1_eqp_x, bn_y, "NE Corner");
            coordinate_point(-cir1_eqp_x, bn_y, "NW Corner");
        }
        
        color("Purple") {
            translate([-cir1_eqp_x+10, bs_y-cir1_eqp_y/4+60]) 
                text("EQUATORIAL PLATFORM TEMPLATE", size=text_size+1, halign="left");
            translate([-cir1_eqp_x+10, bs_y-cir1_eqp_y/4+50]) 
                text(str("Latitude: ", T, "° • Platform: ", round(cir1_eqp_x*2), "mm × ", round(bn_y-bs_y+cir1_eqp_y/2), "mm"), size=text_size, halign="left");
            translate([-cir1_eqp_x+10, bs_y-cir1_eqp_y/4+40]) 
                text(str("Bearing Angle: ", round(B,1), "° • South Bearing Z: ", bs_h, "mm"), size=text_size, halign="left");
        }
    }
}

module bearing_south(test=false,d=bs_d) {
    if (!test) {
        translate([0,bs_y,bs_z+bs_h-eqp_h/2])
        cylinder(d=d,h=eqp_h*2);
    }
}

module bearing_north_holes_design(test=false) {
    if (!test) {
        translate([0,-cir1_eqp_y/2+bn_h/2,eqp_z - bn_support_h])
        {
            for (i=[6,14,22]) {
                translate([printer_x*i/30,(cir1_eqp_y-bn_h)/4,-1])
                cylinder(d=bn_holes_d,h=(bn_support_h + eqp_h)*2);
            }
        }
    }
}

module bearing_north_design(test=false) {
    difference()
    {
        union() 
        {
            cube([printer_x,bn_h,eqp_z]);
            translate([0,-cir1_eqp_y/2+bn_h/2,eqp_z - bn_support_h])
            cube([printer_x*0.85,cir1_eqp_y/2+bn_h/2,bn_support_h]);
        }
        bearing_north_holes_design(test);
    }
}

module bearing_north_east_holes() {
    translate([cir1_eqp_x-printer_x,bn_y,0])
    rotate([0,0,-B])
    translate([0,-bn_h,0])
    bearing_north_holes_design(false);
}

module bearing_north_east(test=false) {
    intersection()
    {
        cone();
        translate([cir1_eqp_x-printer_x,bn_y,0])
        rotate([0,0,-B])
        translate([0,-bn_h,0])
        bearing_north_design(test);
    }
}

module bearing_north_west(test=false) {
    mirror([1,0,0])
    bearing_north_east(test);
}

module bearing_north(test=false) {
    bearing_north_east(test);
    bearing_north_west(test);
}

module cone(short=false) {
    difference()
    {
        rotate([T-90,0,0])
        cylinder(r2=cir1_r*2,r1=0,h=cog_hyp*2);
        if (short) {
            translate([-cog_hyp*2,0,eqp_z])
            cube([cog_hyp*4,cog_hyp*4,cog_hyp*4]);
        }
    }
}

module bearing_south_holes_design(test=false) {
    if (!test) {
        translate([0, -flange_depth/2, 0])
        {
            for (i=[6,14,22]) {
                translate([printer_x*i/30, -10, -1])
                cylinder(d=bn_holes_d, h=bs_h+2);
            }
        }
    }
}

module bearing_south_design(test=false) {
    bearing_height   = bs_h;
    flange_thickness = 6;
    flange_depth     = 30;

    difference()
    {
        union() 
        {
            // Main vertical block (like north bearing)
            cube([printer_x, bn_h, bearing_height]);
            
            // Flange/support structure (like north bearing's support)
            translate([0, -flange_depth, bearing_height - flange_thickness])
            cube([printer_x, flange_depth, flange_thickness]);
        }
        bearing_south_holes_design(test);
    }
}

module bearing_front_south() {
    intersection()
    {
        cone();
        translate([0, bs_y, 0])
        rotate([0, 0, 180])
        translate([-printer_x/2, -bn_h/2, 0])
        bearing_south_design(false);
    }
}

module template_bearing_south() {
    difference()
    {
        cube([bs_d*2,bs_z,1],center=true);
        translate([0,0,-1])
        rotate([0,0,90])
        linear_extrude(height=3)
        text(str("S. Bearing Z"),size=bs_d,valign="center",halign="center");
    }
}

module information_plate(h=2) {
    info = [["Hemisphere:","South"], ["Latitude:",str(T)], ["N. Bearing Z:", str(bs_h, "mm")]];
    lines=3;
    text_height=lines*(text_size+5);
    difference()
    {
        translate([-10,-text_height-text_size/2,0])
        cube([150,text_height-5+2*text_size,h]);
        
        translate([0,-text_size,-h])
        linear_extrude(height=h*3)
        for (i=[1:lines]) {
            translate([0,-(i-1)*(text_size+5),0])
            text(str(info[i-1][0]),size=text_size);
            
            translate([85,-(i-1)*(text_size+5),0])
            text(str(info[i-1][1]),size=text_size);
        }
    }
}

if (mode == "customizer") {
    if (part == "tpt") {
        template_platform_top_2d();
    } else if (part == "bnw") {
        rotate([0,180,0])
        bearing_north_west(false);
    } else if (part == "bne") {
        rotate([0,180,0])
        bearing_north_east(false);
    } else if (part == "tbs") {
        template_bearing_south();
    } else if (part == "bfs") {
        bearing_front_south();
    } else if (part == "info") {
        information_plate();
    }
}
"""
def generate_openscad_file(openscad_code, output_path, format='stl'):
    """Generate a file from OpenSCAD code"""
    try:
        # Write OpenSCAD code to temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.scad', delete=False) as f:
            f.write(openscad_code)
            scad_temp_path = f.name
        
        print(f"Generated temporary SCAD file: {scad_temp_path}")
        print(f"Output format: {format}")
        print(f"Output path: {output_path}")
        
        # Generate the requested format
        if format == 'svg':
            cmd = ['openscad', '-o', output_path, '--export-format', 'svg', scad_temp_path]
        elif format == 'png':
            # Use xvfb-run for PNG generation in headless environment
            cmd = [
                'xvfb-run', '-a', 
                'openscad', 
                '-o', output_path,
                '--export-format', 'png',
                '--imgsize', '800,600',
                '--viewall',  # Auto-adjust camera to fit object
                scad_temp_path
            ]
        elif format == 'pdf':
            cmd = ['openscad', '-o', output_path, '--export-format', 'pdf', scad_temp_path]
        else:  # stl
            cmd = ['openscad', '-o', output_path, scad_temp_path]
        
        print(f"Running command: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        # Clean up temporary SCAD file
        os.unlink(scad_temp_path)
        
        if result.returncode != 0:
            print(f"OpenSCAD stderr: {result.stderr}")
            print(f"OpenSCAD stdout: {result.stdout}")
            raise Exception(f"OpenSCAD error: {result.stderr}")
            
        # Verify the output file was created
        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            raise Exception(f"Output file was not created or is empty: {output_path}")
            
        print(f"Successfully generated {format} file: {output_path} ({os.path.getsize(output_path)} bytes)")
        return True
        
    except Exception as e:
        # Clean up on error
        if 'scad_temp_path' in locals() and os.path.exists(scad_temp_path):
            os.unlink(scad_temp_path)
        print(f"Error in generate_openscad_file: {str(e)}")
        raise e

def build_scad_code_for_part(params, part_type):
    """Build OpenSCAD code for a specific part using the template"""
    return OPENSCAD_TEMPLATE.format(
        part=part_type,
        printer_x=params.get('printerX', 235),
        rb_r=params.get('rbR', 245),
        rb_z=params.get('rbZ', 535),
        tube_lbs=params.get('tubeLbs', 24.25),
        rb_lbs=params.get('rbLbs', 25),
        latitude=params.get('latitude', 38.12),
        eqp_z=params.get('eqpZ', 160),
        eqp_h=params.get('eqpH', 18),
        eqp_lbs=params.get('eqpLbs', 15),
        bs_h=params.get('bsH', 75),
        bs_d=params.get('bsD', 15),
        bn_h=params.get('bnH', 20),
        bn_holes_d=params.get('bnHolesD', 10),
        bn_support_h=params.get('bnSupportH', 10),
        line_thickness=params.get('lineThickness', 0.8),
        text_size=params.get('textSize', 5),
        show_annotations=str(params.get('showAnnotations', True)).lower()
    )

@app.route('/')
def index():
    return send_file('index.html')

@app.route('/health')
def health():
    return jsonify({
        "status": "healthy", 
        "openscad": "working",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/generate-template', methods=['POST'])
def generate_template():
    """Generate a template file from OpenSCAD code"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        openscad_code = data.get('openscad_code', '')
        output_format = data.get('format', 'svg')
        template_type = data.get('template_type', 'unknown')
        
        print(f"=== Generating Template ===")
        print(f"Template type: {template_type}")
        print(f"Output format: {output_format}")
        print(f"OpenSCAD code length: {len(openscad_code)}")
        print(f"First 200 chars: {openscad_code[:200]}...")
        
        if not openscad_code:
            return jsonify({'error': 'No OpenSCAD code provided'}), 400
        
        with tempfile.NamedTemporaryFile(suffix=f'.{output_format}', delete=False) as f:
            output_path = f.name
        
        generate_openscad_file(openscad_code, output_path, output_format)
        
        return send_file(output_path, as_attachment=True)
        
    except Exception as e:
        print(f"Error in generate_template: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/preview-part', methods=['POST'])
def preview_part():
    """Generate a preview image for a specific part"""
    try:
        print(f"=== Preview Part Request Debug ===")
        print(f"Request method: {request.method}")
        print(f"Content-Type: {request.content_type}")
        print(f"Content-Length: {request.content_length}")
        print(f"Headers: {dict(request.headers)}")
        
        # Get the raw request data
        raw_data = request.get_data(as_text=True)
        print(f"Raw request data: {raw_data[:500]}...")  # First 500 chars
        
        # Try to parse JSON manually
        import json
        try:
            data = json.loads(raw_data)
            print(f"Parsed JSON data: {data}")
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}")
            print(f"Problematic data: {raw_data}")
            return jsonify({'error': f'JSON decode error: {str(e)}'}), 400
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        params = data.get('parameters', {})
        part_type = data.get('part_type', 'tpt')
        
        print(f"Part type: {part_type}")
        print(f"Parameters: {params}")
        
        # Test with simple OpenSCAD code first
        test_code = "cube([10,10,10]);"
        print(f"Using test OpenSCAD code: {test_code}")
        
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
            png_path = f.name
        
        print(f"Generating PNG preview...")
        generate_openscad_file(test_code, png_path, 'png')
        
        if os.path.exists(png_path) and os.path.getsize(png_path) > 0:
            print(f"Successfully generated preview: {png_path}")
            return send_file(png_path, mimetype='image/png')
        else:
            raise Exception("PNG file was not created or is empty")
        
    except Exception as e:
        print(f"Error in preview_part: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/generate-all-parts', methods=['POST'])
def generate_all_parts():
    """Generate all parts as individual files and return as ZIP"""
    try:
        data = request.json
        params = data.get('parameters', {})
        
        # Create temporary directory for files
        with tempfile.TemporaryDirectory() as temp_dir:
            zip_path = os.path.join(temp_dir, 'platform_design.zip')
            
            with zipfile.ZipFile(zip_path, 'w') as zipf:
                parts = ['tpt', 'bne', 'bnw', 'tbs', 'bfs', 'info']
                
                for part in parts:
                    # Generate SCAD file for this part
                    scad_code = build_scad_code_for_part(params, part)
                    scad_filename = f"{part}.scad"
                    scad_path = os.path.join(temp_dir, scad_filename)
                    
                    with open(scad_path, 'w') as f:
                        f.write(scad_code)
                    
                    # Add SCAD file to ZIP
                    zipf.write(scad_path, scad_filename)
                    
                    # Generate SVG for TPT only
                    if part == 'tpt':
                        svg_path = os.path.join(temp_dir, 'platform_template.svg')
                        generate_openscad_file(scad_code, svg_path, 'svg')
                        zipf.write(svg_path, 'platform_template.svg')
                    
                    # Generate STL for 3D printable parts (optional)
                    if part in ['bne', 'bnw', 'bfs', 'info']:
                        stl_path = os.path.join(temp_dir, f'{part}.stl')
                        generate_openscad_file(scad_code, stl_path, 'stl')
                        zipf.write(stl_path, f'{part}.stl')
                
                # Add a README file
                readme_content = f"""Dobsonian Equatorial Platform Design Files

Generated Parameters:
- Latitude: {params.get('latitude', 38.12)}°
- Platform Height: {params.get('eqpZ', 160)}mm
- Rocker Box Radius: {params.get('rbR', 245)}mm

Files included:
- tpt.scad - Platform Top Template (2D)
- bne.scad - North East Bearing
- bnw.scad - North West Bearing  
- tbs.scad - Template Bearing South
- bfs.scad - Front South Bearing
- info.scad - Information Plate
- platform_template.svg - 2D Template for cutting

Instructions:
1. Use the SVG file for cutting the platform template
2. Use the SCAD files to generate STLs for 3D printing
3. Adjust parameters in SCAD files if needed
"""
                readme_path = os.path.join(temp_dir, 'README.txt')
                with open(readme_path, 'w') as f:
                    f.write(readme_content)
                zipf.write(readme_path, 'README.txt')
            
            return send_file(zip_path, as_attachment=True, download_name='platform_design.zip')
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
