from flask import Flask, request, send_file, jsonify
import subprocess
import tempfile
import os
import logging
from datetime import datetime

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OpenSCADRenderer:
    def __init__(self, openscad_path='openscad'):
        self.openscad_path = openscad_path
        self.check_openscad()
    
    def check_openscad(self):
        """Verify OpenSCAD is installed and accessible"""
        try:
            result = subprocess.run(
                [self.openscad_path, '--version'],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                logger.info(f"OpenSCAD found: {result.stdout.strip()}")
                return True
            else:
                logger.error("OpenSCAD not functioning properly")
                return False
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            logger.error(f"OpenSCAD not found: {e}")
            return False
    
    def render_template(self, scad_code, output_format='svg'):
        """Render OpenSCAD code to specified format"""
        
        # Create temporary SCAD file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.scad', delete=False) as scad_file:
            scad_file.write(scad_code)
            scad_path = scad_file.name
        
        output_path = tempfile.mktemp(suffix=f'.{output_format}')
        
        try:
            # Build command - CORRECT SYNTAX
            cmd = [
                self.openscad_path,
                '-o', output_path,
                scad_path
            ]
            
            # Execute
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0 and os.path.exists(output_path):
                logger.info(f"Successfully generated {output_format} file")
                return True, output_path, None
            else:
                error_msg = f"OpenSCAD error: {result.stderr}"
                logger.error(error_msg)
                return False, None, error_msg
                
        except subprocess.TimeoutExpired:
            error_msg = "OpenSCAD rendering timed out"
            logger.error(error_msg)
            return False, None, error_msg
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(error_msg)
            return False, None, error_msg
        finally:
            # Clean up SCAD file
            if os.path.exists(scad_path):
                os.unlink(scad_path)

# Initialize renderer
renderer = OpenSCADRenderer()

@app.route('/generate-template', methods=['POST'])
def generate_template():
    try:
        data = request.json
        scad_code = data.get('openscad_code')
        output_format = data.get('format', 'svg')
        
        if not scad_code:
            return jsonify({'error': 'No OpenSCAD code provided'}), 400
        
        logger.info(f"Generating {output_format} template")
        
        success, output_path, error = renderer.render_template(scad_code, output_format)
        
        if success:
            # Send file to client
            response = send_file(
                output_path,
                as_attachment=True,
                download_name=f'platform_template.{output_format}'
            )
            
            # Schedule cleanup
            @response.call_on_close
            def cleanup():
                if os.path.exists(output_path):
                    os.unlink(output_path)
            
            return response
        else:
            return jsonify({'error': error}), 500
            
    except Exception as e:
        logger.error(f"Template generation error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Test if OpenSCAD is working
        test_scad = "circle(10);"
        success, _, error = renderer.render_template(test_scad, 'svg')
        
        return jsonify({
            'status': 'healthy' if success else 'unhealthy',
            'openscad': 'working' if success else f'error: {error}',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/test-openscad', methods=['GET'])
def test_openscad():
    """Test OpenSCAD directly"""
    try:
        # Create a simple test SCAD file
        test_scad = """
        $fn=100;
        difference() {
            square([100, 50], center=true);
            circle(20);
        }
        """
        
        success, output_path, error = renderer.render_template(test_scad, 'svg')
        
        if success:
            return send_file(output_path, as_attachment=True, download_name='test_output.svg')
        else:
            return jsonify({'error': error}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Test OpenSCAD on startup
    logger.info("Testing OpenSCAD connection...")
    test_scad = "circle(10);"
    success, _, error = renderer.render_template(test_scad, 'svg')
    
    if success:
        logger.info("✓ OpenSCAD is working correctly")
    else:
        logger.error(f"✗ OpenSCAD test failed: {error}")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
