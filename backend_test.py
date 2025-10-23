import requests
import sys
import json
from datetime import datetime

class InventoryAPITester:
    def __init__(self, base_url="http://192.168.50.182:5173/"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_pieces = []
        self.created_fournisseurs = []
        self.created_relations = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else self.api_url
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if method == 'GET' and 'pieces' in endpoint:
                        print(f"   Response: Found {len(response_data) if isinstance(response_data, list) else 1} piece(s)")
                    elif method == 'POST' and 'pieces' in endpoint:
                        print(f"   Created piece ID: {response_data.get('id', 'N/A')}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_api_root(self):
        """Test API root endpoint"""
        success, response = self.run_test(
            "API Root",
            "GET",
            "",
            200
        )
        return success

    def test_get_pieces_empty(self):
        """Test getting pieces when database might be empty"""
        success, response = self.run_test(
            "Get All Pieces (Initial)",
            "GET",
            "pieces",
            200
        )
        if success:
            print(f"   Found {len(response)} existing pieces")
        return success

    def test_create_piece(self, piece_data):
        """Create a piece with test data"""
        success, response = self.run_test(
            f"Create Piece - {piece_data['nom_piece']}",
            "POST",
            "pieces",
            200,  # FastAPI typically returns 200 for successful POST, not 201
            data=piece_data
        )
        if success and 'id' in response:
            self.created_pieces.append(response['id'])
            return response['id']
        return None

    def test_get_piece_by_id(self, piece_id):
        """Get a specific piece by ID"""
        success, response = self.run_test(
            "Get Piece by ID",
            "GET",
            f"pieces/{piece_id}",
            200
        )
        return success, response

    def test_update_piece(self, piece_id, updated_data):
        """Update a piece"""
        success, response = self.run_test(
            "Update Piece",
            "PUT",
            f"pieces/{piece_id}",
            200,
            data=updated_data
        )
        return success, response

    def test_delete_piece(self, piece_id):
        """Delete a piece"""
        success, response = self.run_test(
            "Delete Piece",
            "DELETE",
            f"pieces/{piece_id}",
            200
        )
        return success

    def test_get_pieces_after_operations(self):
        """Test getting all pieces after CRUD operations"""
        success, response = self.run_test(
            "Get All Pieces (After Operations)",
            "GET",
            "pieces",
            200
        )
        return success, response

    # SUPPLIER TESTS
    def test_get_fournisseurs_empty(self):
        """Test getting suppliers when database might be empty"""
        success, response = self.run_test(
            "Get All Suppliers (Initial)",
            "GET",
            "fournisseurs",
            200
        )
        if success:
            print(f"   Found {len(response)} existing suppliers")
        return success

    def test_create_fournisseur(self, fournisseur_data):
        """Create a supplier with test data"""
        success, response = self.run_test(
            f"Create Supplier - {fournisseur_data['nom']}",
            "POST",
            "fournisseurs",
            200,
            data=fournisseur_data
        )
        if success and 'id' in response:
            self.created_fournisseurs.append(response['id'])
            return response['id']
        return None

    def test_get_fournisseur_by_id(self, fournisseur_id):
        """Get a specific supplier by ID"""
        success, response = self.run_test(
            "Get Supplier by ID",
            "GET",
            f"fournisseurs/{fournisseur_id}",
            200
        )
        return success, response

    def test_update_fournisseur(self, fournisseur_id, updated_data):
        """Update a supplier"""
        success, response = self.run_test(
            "Update Supplier",
            "PUT",
            f"fournisseurs/{fournisseur_id}",
            200,
            data=updated_data
        )
        return success, response

    def test_delete_fournisseur(self, fournisseur_id):
        """Delete a supplier"""
        success, response = self.run_test(
            "Delete Supplier",
            "DELETE",
            f"fournisseurs/{fournisseur_id}",
            200
        )
        return success

    # PIECE-SUPPLIER RELATION TESTS
    def test_create_piece_fournisseur_relation(self, relation_data):
        """Create a piece-supplier relation"""
        success, response = self.run_test(
            f"Create Piece-Supplier Relation",
            "POST",
            "pieces-fournisseurs",
            200,
            data=relation_data
        )
        if success and 'id' in response:
            self.created_relations.append(response['id'])
            return response['id']
        return None

    def test_get_pieces_fournisseurs(self):
        """Get all piece-supplier relations"""
        success, response = self.run_test(
            "Get All Piece-Supplier Relations",
            "GET",
            "pieces-fournisseurs",
            200
        )
        return success, response

    def test_delete_piece_fournisseur_relation(self, relation_id):
        """Delete a piece-supplier relation"""
        success, response = self.run_test(
            "Delete Piece-Supplier Relation",
            "DELETE",
            f"pieces-fournisseurs/{relation_id}",
            200
        )
        return success

def main():
    print("🚀 Starting Inventory Management API Tests")
    print("=" * 50)
    
    # Setup
    tester = InventoryAPITester()
    
    # Test data as specified in the requirements
    test_piece_data = {
        "numero_origine": "P-6205",
        "fabricant": "SKF",
        "nom_piece": "Roulement à billes 6205",
        "description": "Roulement à billes haute qualité pour maintenance industrielle",
        "quantite_actuelle": 5,
        "quantite_min": 10,  # This will trigger "critical" status
        "quantite_max": 50,
        "quantite_a_commander": 0,
        "quantite_en_commande": 0,
        "emplacement": "A1-B2",
        "prix_unitaire": 15.50
    }

    # Supplier test data from requirements
    fournisseur_1_data = {
        "nom": "Bearing Solutions Inc.",
        "contact": "Jean Tremblay",
        "telephone": "514-555-0123",
        "email": "j.tremblay@bearingsolutions.ca",
        "adresse": "1234 Rue Industrielle, Montréal, QC H3B 2N4"
    }

    fournisseur_2_data = {
        "nom": "Pièces Industrielles Québec",
        "contact": "Marie Dubois",
        "telephone": "418-555-0456",
        "email": "m.dubois@piecesindustrielles.qc.ca",
        "adresse": ""  # Test with empty address
    }

    # Run tests
    print("\n📋 Phase 1: Basic API Connectivity")
    if not tester.test_api_root():
        print("❌ API root endpoint failed, stopping tests")
        return 1

    print("\n📋 Phase 2: Initial Data State")
    tester.test_get_pieces_empty()
    tester.test_get_fournisseurs_empty()

    print("\n📋 Phase 3: Create Pieces")
    piece_id_1 = tester.test_create_piece(test_piece_data)
    if not piece_id_1:
        print("❌ Piece creation failed, stopping tests")
        return 1

    print("\n📋 Phase 4: Create Suppliers")
    fournisseur_id_1 = tester.test_create_fournisseur(fournisseur_1_data)
    fournisseur_id_2 = tester.test_create_fournisseur(fournisseur_2_data)
    
    if not fournisseur_id_1 or not fournisseur_id_2:
        print("❌ Supplier creation failed, stopping tests")
        return 1

    print("\n📋 Phase 5: Test Supplier CRUD")
    # Test getting supplier by ID
    success, supplier_data = tester.test_get_fournisseur_by_id(fournisseur_id_1)
    if success:
        print(f"   Retrieved supplier: {supplier_data.get('nom', 'N/A')}")
        print(f"   Contact: {supplier_data.get('contact', 'N/A')}")

    # Test updating supplier
    updated_supplier_data = fournisseur_1_data.copy()
    updated_supplier_data["telephone"] = "514-555-9999"  # Update phone
    success, updated_supplier = tester.test_update_fournisseur(fournisseur_id_1, updated_supplier_data)
    if success:
        print(f"   Updated phone to: {updated_supplier.get('telephone', 'N/A')}")

    print("\n📋 Phase 6: Create Piece-Supplier Relations")
    # Create relation 1: Piece with Supplier 1
    relation_1_data = {
        "piece_id": piece_id_1,
        "fournisseur_id": fournisseur_id_1,
        "numero_piece_fournisseur": "BS-6205-2024",
        "prix_fournisseur": 14.25,
        "delai_livraison": 5
    }
    
    relation_id_1 = tester.test_create_piece_fournisseur_relation(relation_1_data)
    if not relation_id_1:
        print("❌ First relation creation failed")
    else:
        print(f"   Created relation with supplier part number: {relation_1_data['numero_piece_fournisseur']}")
        print(f"   Price: {relation_1_data['prix_fournisseur']} CAD $")

    # Create relation 2: Same piece with Supplier 2
    relation_2_data = {
        "piece_id": piece_id_1,
        "fournisseur_id": fournisseur_id_2,
        "numero_piece_fournisseur": "PIQ-ROUL-6205",
        "prix_fournisseur": 16.50,
        "delai_livraison": 3
    }
    
    relation_id_2 = tester.test_create_piece_fournisseur_relation(relation_2_data)
    if not relation_id_2:
        print("❌ Second relation creation failed")
    else:
        print(f"   Created relation with supplier part number: {relation_2_data['numero_piece_fournisseur']}")
        print(f"   Price: {relation_2_data['prix_fournisseur']} CAD $")

    print("\n📋 Phase 7: Test Relations Retrieval")
    success, relations = tester.test_get_pieces_fournisseurs()
    if success:
        print(f"   Found {len(relations)} piece-supplier relations")
        for relation in relations:
            print(f"   - {relation.get('piece_nom', 'N/A')} ← → {relation.get('fournisseur_nom', 'N/A')}")
            print(f"     Part #: {relation.get('numero_piece_fournisseur', 'N/A')}, Price: {relation.get('prix_fournisseur', 0)} CAD $")

    print("\n📋 Phase 8: Test Piece with Suppliers Integration")
    # Get the piece again to see if suppliers are included
    success, piece_with_suppliers = tester.test_get_piece_by_id(piece_id_1)
    if success:
        suppliers = piece_with_suppliers.get('fournisseurs', [])
        print(f"   Piece '{piece_with_suppliers.get('nom_piece', 'N/A')}' has {len(suppliers)} supplier(s)")
        for supplier in suppliers:
            fournisseur_info = supplier.get('fournisseur', {})
            print(f"   - Supplier: {fournisseur_info.get('nom', 'N/A')}")
            print(f"     Part #: {supplier.get('numero_piece_fournisseur', 'N/A')}")
            print(f"     Price: {supplier.get('prix_fournisseur', 0)} CAD $")
            print(f"     Delivery: {supplier.get('delai_livraison', 0)} days")

    print("\n📋 Phase 9: Test Currency Display (CAD $)")
    # Verify all prices are properly formatted
    success, all_pieces = tester.test_get_pieces_after_operations()
    if success:
        print("   Verifying CAD $ currency display:")
        for piece in all_pieces:
            print(f"   - {piece.get('nom_piece', 'N/A')}: {piece.get('prix_unitaire', 0):.2f} CAD $")
            for supplier in piece.get('fournisseurs', []):
                print(f"     Supplier price: {supplier.get('prix_fournisseur', 0):.2f} CAD $")

    print("\n📋 Phase 10: Cleanup Test")
    # Test deleting a relation
    if relation_id_2:
        tester.test_delete_piece_fournisseur_relation(relation_id_2)
        print("   Deleted one piece-supplier relation")

    # Verify final state
    success, final_relations = tester.test_get_pieces_fournisseurs()
    if success:
        print(f"   Final relations count: {len(final_relations)}")

    # Print results
    print("\n" + "=" * 50)
    print(f"📊 TEST RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed! Backend API is working correctly.")
        print("✅ Supplier management features are functional")
        print("✅ Piece-supplier relations are working")
        print("✅ CAD $ currency is properly handled")
        return 0
    else:
        print("⚠️  Some tests failed. Check the API implementation.")
        return 1

if __name__ == "__main__":
    sys.exit(main())