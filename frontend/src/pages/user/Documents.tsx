import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  List, 
  Space,
  Tag,
  Modal,
  Input,
  Selector,
  Toast,
  Badge,
  Grid,
  ImageUploader,
  ImageUploadItem
} from 'antd-mobile';
import {
  DocumentTextOutline,
  DownloadOutline,
  UploadOutline,
  FolderOutline,
  CheckCircleOutline,
  ClockCircleOutline,
  ExclamationCircleOutline,
  EyeOutline,
  DeleteOutline
} from 'antd-mobile-icons';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { userAPI } from '../../utils/api';
import { useSocket } from '../../utils/socket';
import LoadingSpinner from '../../components/LoadingSpinner';
import PaymentCard from '../../components/user/PaymentCard';
import './Documents.css';

// Zod validation schemas
const documentUploadSchema = z.object({
  category: z.enum(['income', 'identity', 'bank_statement', 'other']),
  files: z.array(z.any()).min(1, 'At least one file is required')
});

interface DocumentCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  count: number;
  required: boolean;
}

interface UserDocument {
  id: string;
  name: string;
  category: 'income' | 'identity' | 'bank_statement' | 'other';
  size: number;
  uploadDate: string;
  status: 'approved' | 'pending' | 'rejected' | 'expired';
  expiryDate?: string;
  downloadUrl?: string;
  rejectReason?: string;
}

const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { on, off } = useSocket();

  // State management
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Upload states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<string>('');
  const [fileList, setFileList] = useState<ImageUploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<UserDocument | null>(null);

  const documentCategories = [
    { label: 'All Documents', value: 'all' },
    { label: 'Income Verification', value: 'income' },
    { label: 'Identity Documents', value: 'identity' },
    { label: 'Bank Statements', value: 'bank_statement' },
    { label: 'Other Documents', value: 'other' }
  ];

  useEffect(() => {
    loadDocuments();
  }, []);

  // Socket listeners for real-time updates
  useEffect(() => {
    const handleDocumentUpdate = (data: any) => {
      Toast.show({
        icon: data.status === 'approved' ? 'success' : 'fail',
        content: `Document ${data.status}: ${data.documentName}`
      });
      loadDocuments();
    };

    on('document:statusChanged', handleDocumentUpdate);
    return () => off('document:statusChanged', handleDocumentUpdate);
  }, [on, off]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      
      const [docsRes, categoriesRes] = await Promise.all([
        userAPI.getDocuments(),
        userAPI.getDocumentCategories()
      ]);

      if (docsRes.success) {
        setDocuments(docsRes.data);
      }
      
      if (categoriesRes.success) {
        setCategories(categoriesRes.data);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
      Toast.show({
        icon: 'fail',
        content: 'Failed to load documents'
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadDocuments = async () => {
    if (!uploadCategory || fileList.length === 0) {
      Toast.show({
        icon: 'fail',
        content: 'Please select category and files'
      });
      return;
    }

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('category', uploadCategory);
      
      fileList.forEach((file, index) => {
        if (file.file) {
          formData.append('files', file.file);
        }
      });

      const response = await userAPI.uploadDocuments(formData);
      
      if (response.success) {
        Toast.show({
          icon: 'success',
          content: 'Documents uploaded successfully'
        });
        
        setShowUploadModal(false);
        setFileList([]);
        setUploadCategory('');
        loadDocuments();
      }
    } catch (error) {
      console.error('Document upload failed:', error);
      Toast.show({
        icon: 'fail',
        content: 'Failed to upload documents'
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadDocument = async (doc: UserDocument) => {
    try {
      const response = await userAPI.downloadDocument(doc.id);
      
      if (response.success && response.data) {
        const blob = new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.name;
        link.click();
        window.URL.revokeObjectURL(url);
        
        Toast.show({
          icon: 'success',
          content: 'Document downloaded'
        });
      }
    } catch (error) {
      console.error('Download failed:', error);
      Toast.show({
        icon: 'fail',
        content: 'Failed to download document'
      });
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      const response = await userAPI.deleteDocument(documentId);
      
      if (response.success) {
        Toast.show({
          icon: 'success',
          content: 'Document deleted'
        });
        loadDocuments();
      }
    } catch (error) {
      console.error('Delete failed:', error);
      Toast.show({
        icon: 'fail',
        content: 'Failed to delete document'
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      approved: '#52c41a',
      pending: '#faad14',
      rejected: '#ff4d4f',
      expired: '#8c8c8c'
    };
    return colors[status as keyof typeof colors] || '#8c8c8c';
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      approved: <CheckCircleOutline />,
      pending: <ClockCircleOutline />,
      rejected: <ExclamationCircleOutline />,
      expired: <ExclamationCircleOutline />
    };
    return icons[status as keyof typeof icons] || <ClockCircleOutline />;
  };

  const filteredDocuments = selectedCategory === 'all' 
    ? documents 
    : documents.filter(doc => doc.category === selectedCategory);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="documents-page">
      {/* Header */}
      <div className="documents-header">
        <h1>Document Center</h1>
        <p>Upload and manage your documents</p>
      </div>

      {/* Card 1: Document Categories */}
      <PaymentCard
        title="Document Categories"
        icon={<FolderOutline />}
        action={
          <Button size="small" fill="none" onClick={() => setShowCategoryModal(true)}>
            View All
          </Button>
        }
      >
        <div className="document-categories">
          <Grid columns={2} gap={12}>
            {categories.slice(0, 4).map((category) => (
              <Grid.Item key={category.id}>
                <div 
                  className={`category-card ${selectedCategory === category.id ? 'selected' : ''}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <div className="category-icon">
                    {category.icon}
                    {category.required && (
                      <Badge 
                        content="!"
                        style={{
                          '--right': '-4px',
                          '--top': '-4px',
                          backgroundColor: '#ff4d4f'
                        }}
                      />
                    )}
                  </div>
                  <div className="category-info">
                    <div className="category-name">{category.name}</div>
                    <div className="category-count">{category.count} files</div>
                  </div>
                </div>
              </Grid.Item>
            ))}
          </Grid>

          <div className="category-filter">
            <Selector
              options={documentCategories}
              value={[selectedCategory]}
              onChange={(val) => setSelectedCategory(val[0])}
            />
          </div>
        </div>
      </PaymentCard>

      {/* Card 2: Recent Documents */}
      <PaymentCard
        title="Recent Documents"
        icon={<DocumentTextOutline />}
        action={
          <Button size="small" fill="none" onClick={() => setShowDocumentModal(true)}>
            View All
          </Button>
        }
      >
        <div className="recent-documents">
          <List>
            {filteredDocuments.slice(0, 5).map((doc) => (
              <List.Item
                key={doc.id}
                prefix={
                  <div className="document-status-icon">
                    {getStatusIcon(doc.status)}
                  </div>
                }
                extra={
                  <Space>
                    <Button 
                      size="mini" 
                      fill="none"
                      onClick={() => downloadDocument(doc)}
                    >
                      <DownloadOutline />
                    </Button>
                    <Button 
                      size="mini" 
                      fill="none"
                      onClick={() => setSelectedDocument(doc)}
                    >
                      <EyeOutline />
                    </Button>
                  </Space>
                }
                description={
                  <div className="document-meta">
                    <span>{(doc.size / 1024).toFixed(0)}KB</span>
                    <span>•</span>
                    <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                    <Tag 
                      color={getStatusColor(doc.status)}
                      style={{ marginLeft: '8px', fontSize: '10px' }}
                    >
                      {doc.status}
                    </Tag>
                  </div>
                }
              >
                <div className="document-name">{doc.name}</div>
              </List.Item>
            ))}
          </List>

          {filteredDocuments.length === 0 && (
            <div className="empty-documents">
              <DocumentTextOutline />
              <p>No documents found</p>
            </div>
          )}
        </div>
      </PaymentCard>

      {/* Card 3: Upload Documents */}
      <PaymentCard
        title="Upload Documents"
        icon={<UploadOutline />}
      >
        <div className="upload-section">
          <div className="upload-info">
            <p>Upload your documents for verification. Accepted formats: PDF, JPG, PNG</p>
            <p className="file-limit">Maximum file size: 10MB per file</p>
          </div>

          <Space direction="vertical" style={{ width: '100%' }}>
            <Button 
              block 
              color="primary"
              onClick={() => setShowUploadModal(true)}
            >
              <UploadOutline />
              Upload Documents
            </Button>
            
            <Button 
              block 
              fill="outline"
              onClick={() => navigate('/user/support')}
            >
              Upload Requirements
            </Button>
          </Space>
        </div>
      </PaymentCard>

      {/* Card 4: Document Status Overview */}
      <PaymentCard
        title="Document Status"
        icon={<CheckCircleOutline />}
      >
        <div className="status-overview">
          <div className="status-stats">
            <div className="status-item approved">
              <div className="status-number">{documents.filter(d => d.status === 'approved').length}</div>
              <div className="status-label">Approved</div>
            </div>
            <div className="status-item pending">
              <div className="status-number">{documents.filter(d => d.status === 'pending').length}</div>
              <div className="status-label">Pending</div>
            </div>
            <div className="status-item rejected">
              <div className="status-number">{documents.filter(d => d.status === 'rejected').length}</div>
              <div className="status-label">Rejected</div>
            </div>
            <div className="status-item expired">
              <div className="status-number">{documents.filter(d => d.status === 'expired').length}</div>
              <div className="status-label">Expired</div>
            </div>
          </div>

          <div className="completion-status">
            <div className="completion-info">
              <span>Document Verification</span>
              <span>{Math.round((documents.filter(d => d.status === 'approved').length / Math.max(documents.length, 1)) * 100)}% Complete</span>
            </div>
          </div>
        </div>
      </PaymentCard>

      {/* Modals */}
      
      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        title="Upload Documents"
        closeOnMaskClick
        onClose={() => setShowUploadModal(false)}
        content={
          <div className="upload-modal">
            <div className="upload-form">
              <div className="form-item">
                <label>Document Category *</label>
                <Selector
                  options={documentCategories.slice(1)} // Exclude 'All Documents'
                  value={uploadCategory ? [uploadCategory] : []}
                  onChange={(val) => setUploadCategory(val[0])}
                />
              </div>

              <div className="form-item">
                <label>Select Files *</label>
                <ImageUploader
                  value={fileList}
                  onChange={setFileList}
                  multiple
                  maxCount={5}
                  accept="image/*,application/pdf"
                >
                  <div className="upload-placeholder">
                    <UploadOutline />
                    <span>Click to upload</span>
                  </div>
                </ImageUploader>
              </div>

              <div className="upload-actions">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    block 
                    color="primary"
                    loading={uploading}
                    disabled={!uploadCategory || fileList.length === 0}
                    onClick={uploadDocuments}
                  >
                    Upload Files
                  </Button>
                  <Button 
                    block 
                    fill="outline"
                    onClick={() => setShowUploadModal(false)}
                  >
                    Cancel
                  </Button>
                </Space>
              </div>
            </div>
          </div>
        }
      />

      {/* All Categories Modal */}
      <Modal
        visible={showCategoryModal}
        title="All Document Categories"
        closeOnMaskClick
        onClose={() => setShowCategoryModal(false)}
        content={
          <div className="all-categories">
            <List>
              {categories.map((category) => (
                <List.Item
                  key={category.id}
                  prefix={category.icon}
                  extra={
                    <Badge 
                      content={category.count}
                      style={{ backgroundColor: '#1677ff' }}
                    />
                  }
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setShowCategoryModal(false);
                  }}
                >
                  <div>
                    <div className="category-name">{category.name}</div>
                    {category.required && (
                      <Tag color="error" style={{ fontSize: '10px' }}>Required</Tag>
                    )}
                  </div>
                </List.Item>
              ))}
            </List>
          </div>
        }
      />

      {/* Document Details Modal */}
      {selectedDocument && (
        <Modal
          visible={!!selectedDocument}
          title="Document Details"
          closeOnMaskClick
          onClose={() => setSelectedDocument(null)}
          content={
            <div className="document-details">
              <div className="detail-item">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{selectedDocument.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Category:</span>
                <span className="detail-value">{selectedDocument.category}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Size:</span>
                <span className="detail-value">{(selectedDocument.size / 1024).toFixed(0)}KB</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Upload Date:</span>
                <span className="detail-value">{new Date(selectedDocument.uploadDate).toLocaleDateString()}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <Tag color={getStatusColor(selectedDocument.status)}>
                  {selectedDocument.status}
                </Tag>
              </div>
              
              {selectedDocument.rejectReason && (
                <div className="reject-reason">
                  <h4>Rejection Reason:</h4>
                  <p>{selectedDocument.rejectReason}</p>
                </div>
              )}

              <div className="document-actions">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    block 
                    color="primary"
                    onClick={() => downloadDocument(selectedDocument)}
                  >
                    Download
                  </Button>
                  {selectedDocument.status === 'rejected' && (
                    <Button 
                      block 
                      color="danger"
                      onClick={() => deleteDocument(selectedDocument.id)}
                    >
                      <DeleteOutline />
                      Delete Document
                    </Button>
                  )}
                </Space>
              </div>
            </div>
          }
        />
      )}
    </div>
  );
};

export default DocumentsPage;