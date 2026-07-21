"""
Document versioning tests for CA Copilot.
"""
import pytest
import uuid


class TestDocumentVersioning:
    def _new_doc_id(self):
        return str(uuid.uuid4())

    def test_save_first_version(self):
        from database.db import save_document_version, get_document_versions
        doc_id = self._new_doc_id()
        version = save_document_version(
            document_id=doc_id,
            document_name='test_invoice.pdf',
            document_type='invoice',
            confidence='high',
            created_by='test_user',
        )
        assert version == 1
        versions = get_document_versions(doc_id)
        assert len(versions) == 1
        assert versions[0]['version_number'] == 1
        assert versions[0]['is_current'] == 1

    def test_save_multiple_versions(self):
        from database.db import save_document_version, get_document_versions
        doc_id = self._new_doc_id()
        v1 = save_document_version(
            document_id=doc_id,
            document_name='invoice.pdf',
            confidence='low',
        )
        v2 = save_document_version(
            document_id=doc_id,
            document_name='invoice.pdf',
            confidence='high',
        )
        assert v1 == 1
        assert v2 == 2
        versions = get_document_versions(doc_id)
        assert len(versions) == 2
        # Newest first
        assert versions[0]['version_number'] == 2
        assert versions[0]['is_current'] == 1
        # Old version marked not current
        assert versions[1]['version_number'] == 1
        assert versions[1]['is_current'] == 0

    def test_get_versions_empty(self):
        from database.db import get_document_versions
        versions = get_document_versions(str(uuid.uuid4()))
        assert versions == []

    def test_save_version_with_extracted_data(self):
        from database.db import save_document_version, get_document_versions
        import json
        doc_id = self._new_doc_id()
        data = {'invoice_number': 'INV-001', 'total': '10000'}
        version = save_document_version(
            document_id=doc_id,
            document_name='inv.pdf',
            extracted_data=data,
        )
        assert version == 1
        versions = get_document_versions(doc_id)
        assert len(versions) == 1

    def test_save_version_with_hash(self):
        from database.db import save_document_version, get_document_versions
        doc_id = self._new_doc_id()
        sha = 'a' * 64
        save_document_version(
            document_id=doc_id,
            document_name='doc.pdf',
            sha256_hash=sha,
            file_size_bytes=1024,
        )
        versions = get_document_versions(doc_id)
        assert versions[0]['sha256_hash'] == sha
