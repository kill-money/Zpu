import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  List, 
  Space,
  Modal,
  Input,
  TextArea,
  Toast,
  Collapse,
  Badge,
  Tag,
  Divider
} from 'antd-mobile';
import {
  MessageOutline,
  PhoneOutline,
  MailOutline,
  QuestionCircleOutline,
  FileTextOutline,
  CustomerServiceOutline,
  RightOutline,
  SearchOutline,
  CheckCircleOutline
} from 'antd-mobile-icons';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { userAPI } from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import PaymentCard from '../../components/user/PaymentCard';
import './Support.css';

// Zod validation schemas
const supportTicketSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  category: z.enum(['payment', 'loan', 'technical', 'account', 'other']),
  priority: z.enum(['low', 'medium', 'high']),
  description: z.string().min(10, 'Description must be at least 10 characters')
});

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
  tags: string[];
}

interface SupportContact {
  type: 'phone' | 'email' | 'chat';
  label: string;
  value: string;
  availability: string;
  description: string;
}

interface SupportResource {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'article' | 'guide' | 'download';
  url: string;
  duration?: string;
  downloadable: boolean;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  lastResponse?: string;
}

const SupportPage: React.FC = () => {
  const navigate = useNavigate();

  // State management
  const [loading, setLoading] = useState(true);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [supportContacts, setSupportContacts] = useState<SupportContact[]>([]);
  const [supportResources, setSupportResources] = useState<SupportResource[]>([]);
  const [userTickets, setUserTickets] = useState<SupportTicket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  
  // Form states
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: '',
    priority: 'medium',
    description: ''
  });

  const faqCategories = [
    'Getting Started',
    'Loan Application',
    'Payments & Billing',
    'Account Management',
    'Technical Issues'
  ];

  const ticketCategories = [
    { label: 'Payment Issues', value: 'payment' },
    { label: 'Loan Questions', value: 'loan' },
    { label: 'Technical Problems', value: 'technical' },
    { label: 'Account Access', value: 'account' },
    { label: 'Other', value: 'other' }
  ];

  const priorityOptions = [
    { label: 'Low Priority', value: 'low' },
    { label: 'Medium Priority', value: 'medium' },
    { label: 'High Priority', value: 'high' }
  ];

  useEffect(() => {
    loadSupportData();
  }, []);

  const loadSupportData = async () => {
    try {
      setLoading(true);
      
      const [faqsRes, contactsRes, resourcesRes, ticketsRes] = await Promise.all([
        userAPI.getFAQs(),
        userAPI.getSupportContacts(),
        userAPI.getSupportResources(),
        userAPI.getUserTickets()
      ]);

      if (faqsRes.success) setFaqs(faqsRes.data);
      if (contactsRes.success) setSupportContacts(contactsRes.data);
      if (resourcesRes.success) setSupportResources(resourcesRes.data);
      if (ticketsRes.success) setUserTickets(ticketsRes.data);
      
    } catch (error) {
      console.error('Failed to load support data:', error);
      Toast.show({
        icon: 'fail',
        content: 'Failed to load support information'
      });
    } finally {
      setLoading(false);
    }
  };

  const submitSupportTicket = async () => {
    try {
      // Validate form
      const validatedData = supportTicketSchema.parse(ticketForm);
      
      setSubmittingTicket(true);
      
      const response = await userAPI.createSupportTicket(validatedData);
      
      if (response.success) {
        Toast.show({
          icon: 'success',
          content: 'Support ticket created successfully'
        });
        
        setShowTicketModal(false);
        setTicketForm({
          subject: '',
          category: '',
          priority: 'medium',
          description: ''
        });
        
        // Refresh tickets
        const ticketsRes = await userAPI.getUserTickets();
        if (ticketsRes.success) setUserTickets(ticketsRes.data);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        Toast.show({
          icon: 'fail',
          content: error.errors[0]?.message || 'Please check your input'
        });
      } else {
        console.error('Failed to submit ticket:', error);
        Toast.show({
          icon: 'fail',
          content: 'Failed to create support ticket'
        });
      }
    } finally {
      setSubmittingTicket(false);
    }
  };

  const markFAQHelpful = async (faqId: string) => {
    try {
      const response = await userAPI.markFAQHelpful(faqId);
      
      if (response.success) {
        setFaqs(prev => 
          prev.map(faq => 
            faq.id === faqId 
              ? { ...faq, helpful: faq.helpful + 1 }
              : faq
          )
        );
        
        Toast.show({
          icon: 'success',
          content: 'Thank you for your feedback!'
        });
      }
    } catch (error) {
      console.error('Failed to mark FAQ as helpful:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      open: '#1677ff',
      in_progress: '#faad14',
      resolved: '#52c41a',
      closed: '#8c8c8c'
    };
    return colors[status as keyof typeof colors] || '#8c8c8c';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: '#52c41a',
      medium: '#faad14',
      high: '#ff4d4f'
    };
    return colors[priority as keyof typeof colors] || '#8c8c8c';
  };

  // Filter FAQs based on search query
  const filteredFAQs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="support-page">
      {/* Header */}
      <div className="support-header">
        <h1>Support Center</h1>
        <p>Get help with your loans and account</p>
      </div>

      {/* Card 1: Frequently Asked Questions */}
      <PaymentCard
        title="Frequently Asked Questions"
        icon={<QuestionCircleOutline />}
        action={
          <Button size="small" fill="none" onClick={() => setShowResourceModal(true)}>
            All Resources
          </Button>
        }
      >
        <div className="faq-section">
          <div className="search-box">
            <Input
              placeholder="Search FAQs..."
              prefix={<SearchOutline />}
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              clearable
            />
          </div>

          <Collapse accordion>
            {filteredFAQs.slice(0, 5).map((faq) => (
              <Collapse.Panel key={faq.id} title={faq.question}>
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                  
                  <div className="faq-footer">
                    <div className="faq-tags">
                      {faq.tags.map((tag) => (
                        <Tag key={tag} color="primary" style={{ fontSize: '10px' }}>
                          {tag}
                        </Tag>
                      ))}
                    </div>
                    
                    <div className="faq-helpful">
                      <Button 
                        size="mini" 
                        fill="none"
                        onClick={() => markFAQHelpful(faq.id)}
                      >
                        <CheckCircleOutline />
                        Helpful ({faq.helpful})
                      </Button>
                    </div>
                  </div>
                </div>
              </Collapse.Panel>
            ))}
          </Collapse>

          {filteredFAQs.length === 0 && (
            <div className="empty-faqs">
              <QuestionCircleOutline />
              <p>No FAQs found matching your search</p>
            </div>
          )}
        </div>
      </PaymentCard>

      {/* Card 2: Contact Information */}
      <PaymentCard
        title="Contact Support"
        icon={<CustomerServiceOutline />}
        action={
          <Button size="small" fill="none" onClick={() => setShowContactModal(true)}>
            All Options
          </Button>
        }
      >
        <div className="contact-section">
          <List>
            {supportContacts.slice(0, 3).map((contact, index) => (
              <List.Item
                key={index}
                prefix={
                  <div className="contact-icon">
                    {contact.type === 'phone' && <PhoneOutline />}
                    {contact.type === 'email' && <MailOutline />}
                    {contact.type === 'chat' && <MessageOutline />}
                  </div>
                }
                extra={<RightOutline />}
                description={
                  <div className="contact-meta">
                    <div className="contact-value">{contact.value}</div>
                    <div className="contact-availability">{contact.availability}</div>
                  </div>
                }
                onClick={() => {
                  if (contact.type === 'phone') {
                    window.location.href = `tel:${contact.value}`;
                  } else if (contact.type === 'email') {
                    window.location.href = `mailto:${contact.value}`;
                  }
                }}
              >
                <div className="contact-item">
                  <div className="contact-label">{contact.label}</div>
                  <div className="contact-description">{contact.description}</div>
                </div>
              </List.Item>
            ))}
          </List>

          <div className="contact-actions">
            <Button 
              block 
              color="primary"
              onClick={() => setShowTicketModal(true)}
            >
              <MessageOutline />
              Create Support Ticket
            </Button>
          </div>
        </div>
      </PaymentCard>

      {/* Card 3: Help Resources & Your Tickets */}
      <PaymentCard
        title="Help Resources & Tickets"
        icon={<FileTextOutline />}
      >
        <div className="resources-section">
          <div className="section-header">
            <h4>Your Support Tickets</h4>
            {userTickets.length > 0 && (
              <Badge 
                content={userTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length}
                style={{ backgroundColor: '#1677ff' }}
              />
            )}
          </div>

          {userTickets.length > 0 ? (
            <List>
              {userTickets.slice(0, 3).map((ticket) => (
                <List.Item
                  key={ticket.id}
                  prefix={
                    <Tag color={getStatusColor(ticket.status)} style={{ fontSize: '10px' }}>
                      {ticket.status.replace('_', ' ')}
                    </Tag>
                  }
                  extra={
                    <Tag color={getPriorityColor(ticket.priority)} style={{ fontSize: '10px' }}>
                      {ticket.priority}
                    </Tag>
                  }
                  description={`Created: ${new Date(ticket.createdAt).toLocaleDateString()}`}
                  onClick={() => navigate(`/user/support/ticket/${ticket.id}`)}
                >
                  <div className="ticket-item">
                    <div className="ticket-subject">{ticket.subject}</div>
                    {ticket.lastResponse && (
                      <div className="last-response">Last response: {new Date(ticket.lastResponse).toLocaleDateString()}</div>
                    )}
                  </div>
                </List.Item>
              ))}
            </List>
          ) : (
            <div className="no-tickets">
              <MessageOutline />
              <p>No support tickets yet</p>
            </div>
          )}

          <Divider />

          <div className="section-header">
            <h4>Helpful Resources</h4>
          </div>

          <List>
            {supportResources.slice(0, 4).map((resource) => (
              <List.Item
                key={resource.id}
                prefix={
                  <div className="resource-icon">
                    {resource.type === 'video' && <MessageOutline />}
                    {resource.type === 'article' && <FileTextOutline />}
                    {resource.type === 'guide' && <QuestionCircleOutline />}
                    {resource.type === 'download' && <MessageOutline />}
                  </div>
                }
                extra={<RightOutline />}
                description={resource.description}
                onClick={() => window.open(resource.url, '_blank')}
              >
                <div className="resource-item">
                  <div className="resource-title">{resource.title}</div>
                  <div className="resource-meta">
                    <Tag color="primary" style={{ fontSize: '10px' }}>
                      {resource.type}
                    </Tag>
                    {resource.duration && (
                      <span className="resource-duration">{resource.duration}</span>
                    )}
                  </div>
                </div>
              </List.Item>
            ))}
          </List>
        </div>
      </PaymentCard>

      {/* Modals */}
      
      {/* Create Support Ticket Modal */}
      <Modal
        visible={showTicketModal}
        title="Create Support Ticket"
        closeOnMaskClick
        onClose={() => setShowTicketModal(false)}
        content={
          <div className="ticket-modal">
            <div className="ticket-form">
              <div className="form-item">
                <label>Subject *</label>
                <Input
                  placeholder="Brief description of your issue"
                  value={ticketForm.subject}
                  onChange={(val) => setTicketForm(prev => ({ ...prev, subject: val }))}
                />
              </div>

              <div className="form-item">
                <label>Category *</label>
                <List>
                  {ticketCategories.map((category) => (
                    <List.Item
                      key={category.value}
                      extra={
                        <input 
                          type="radio" 
                          name="category"
                          checked={ticketForm.category === category.value}
                          onChange={() => setTicketForm(prev => ({ ...prev, category: category.value }))}
                        />
                      }
                      onClick={() => setTicketForm(prev => ({ ...prev, category: category.value }))}
                    >
                      {category.label}
                    </List.Item>
                  ))}
                </List>
              </div>

              <div className="form-item">
                <label>Priority</label>
                <List>
                  {priorityOptions.map((priority) => (
                    <List.Item
                      key={priority.value}
                      extra={
                        <input 
                          type="radio" 
                          name="priority"
                          checked={ticketForm.priority === priority.value}
                          onChange={() => setTicketForm(prev => ({ ...prev, priority: priority.value }))}
                        />
                      }
                      onClick={() => setTicketForm(prev => ({ ...prev, priority: priority.value }))}
                    >
                      {priority.label}
                    </List.Item>
                  ))}
                </List>
              </div>

              <div className="form-item">
                <label>Description *</label>
                <TextArea
                  placeholder="Please provide detailed information about your issue..."
                  rows={4}
                  value={ticketForm.description}
                  onChange={(val) => setTicketForm(prev => ({ ...prev, description: val }))}
                />
              </div>

              <div className="form-actions">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    block 
                    color="primary"
                    loading={submittingTicket}
                    disabled={!ticketForm.subject || !ticketForm.category || !ticketForm.description}
                    onClick={submitSupportTicket}
                  >
                    Create Ticket
                  </Button>
                  <Button 
                    block 
                    fill="outline"
                    onClick={() => setShowTicketModal(false)}
                  >
                    Cancel
                  </Button>
                </Space>
              </div>
            </div>
          </div>
        }
      />

      {/* All Contact Options Modal */}
      <Modal
        visible={showContactModal}
        title="Contact Support"
        closeOnMaskClick
        onClose={() => setShowContactModal(false)}
        content={
          <div className="contact-modal">
            <p className="contact-intro">
              Choose the best way to reach our support team. We're here to help!
            </p>
            
            <List>
              {supportContacts.map((contact, index) => (
                <List.Item
                  key={index}
                  prefix={
                    <div className="contact-icon-large">
                      {contact.type === 'phone' && <PhoneOutline />}
                      {contact.type === 'email' && <MailOutline />}
                      {contact.type === 'chat' && <MessageOutline />}
                    </div>
                  }
                  description={
                    <div>
                      <div className="contact-description">{contact.description}</div>
                      <div className="contact-availability">{contact.availability}</div>
                      <div className="contact-value">{contact.value}</div>
                    </div>
                  }
                  onClick={() => {
                    if (contact.type === 'phone') {
                      window.location.href = `tel:${contact.value}`;
                    } else if (contact.type === 'email') {
                      window.location.href = `mailto:${contact.value}`;
                    }
                    setShowContactModal(false);
                  }}
                >
                  <div className="contact-title">{contact.label}</div>
                </List.Item>
              ))}
            </List>
          </div>
        }
      />

      {/* All Resources Modal */}
      <Modal
        visible={showResourceModal}
        title="Help Resources"
        closeOnMaskClick
        onClose={() => setShowResourceModal(false)}
        content={
          <div className="resource-modal">
            <div className="resource-categories">
              {faqCategories.map((category) => (
                <div key={category} className="resource-category">
                  <h4>{category}</h4>
                  <List>
                    {faqs
                      .filter(faq => faq.category === category)
                      .slice(0, 3)
                      .map(faq => (
                        <List.Item key={faq.id} onClick={() => setShowResourceModal(false)}>
                          {faq.question}
                        </List.Item>
                      ))}
                  </List>
                </div>
              ))}
            </div>
          </div>
        }
      />
    </div>
  );
};

export default SupportPage;