import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Mail, Plus, X, Users, Clock, Send, AlertCircle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface EmailDeliveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportData?: {
    name: string;
    type: string;
    size: string;
    downloadUrl?: string;
  };
  onEmailSent?: () => void;
}

interface EmailRecipient {
  email: string;
  name?: string;
  role?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  reportTypes: string[];
}

const defaultTemplates: EmailTemplate[] = [
  {
    id: 'standard',
    name: 'Standard Report',
    subject: 'Report: {reportName}',
    body: 'Please find the attached {reportType} report generated on {date}.\n\nBest regards,\nResourceFlow Team',
    reportTypes: ['all']
  },
  {
    id: 'executive',
    name: 'Executive Summary',
    subject: 'Executive Report: {reportName}',
    body: 'Dear Executive Team,\n\nPlease find the attached executive report for your review.\n\nKey highlights will be discussed in the next leadership meeting.\n\nBest regards,\nResourceFlow Team',
    reportTypes: ['Resource Utilization Report', 'Capacity Planning Report']
  },
  {
    id: 'change-allocation',
    name: 'Change Allocation',
    subject: 'Change Allocation Report: {reportName}',
    body: 'Dear Team,\n\nThe change allocation analysis is complete. Please review the attached report for resource utilization insights.\n\nBest regards,\nResourceFlow Team',
    reportTypes: ['Change Allocation Report']
  }
];

export function EmailDeliveryModal({ open, onOpenChange, reportData, onEmailSent }: EmailDeliveryModalProps) {
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('standard');
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [useCustomTemplate, setUseCustomTemplate] = useState(false);
  const [includeAttachment, setIncludeAttachment] = useState(true);
  const [sendCopy, setSendCopy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Suggested recipients based on roles
  const suggestedRecipients: EmailRecipient[] = [
    { email: 'manager@company.com', name: 'Project Manager', role: 'Manager' },
    { email: 'director@company.com', name: 'Director', role: 'Director' },
    { email: 'controller@company.com', name: 'Business Controller', role: 'Business Controller' },
    { email: 'admin@company.com', name: 'System Admin', role: 'Admin' }
  ];

  const addRecipient = (recipient: EmailRecipient) => {
    if (!recipients.find(r => r.email === recipient.email)) {
      setRecipients([...recipients, recipient]);
    }
  };

  const addNewRecipient = () => {
    if (newRecipientEmail && !recipients.find(r => r.email === newRecipientEmail)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(newRecipientEmail)) {
        setRecipients([...recipients, { email: newRecipientEmail }]);
        setNewRecipientEmail('');
      } else {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
      }
    }
  };

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r.email !== email));
  };

  const getTemplate = () => {
    return defaultTemplates.find(t => t.id === selectedTemplate) || defaultTemplates[0];
  };

  const processTemplate = (template: string) => {
    if (!reportData) return template;
    
    return template
      .replace('{reportName}', reportData.name)
      .replace('{reportType}', reportData.type)
      .replace('{date}', new Date().toLocaleDateString());
  };

  const handleSendEmail = async () => {
    if (recipients.length === 0) {
      toast({
        title: "No Recipients",
        description: "Please add at least one recipient.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const template = getTemplate();
      const subject = useCustomTemplate ? customSubject : processTemplate(template.subject);
      const body = useCustomTemplate ? customBody : processTemplate(template.body);

      await apiRequest('/api/reports/email', {
        method: 'POST',
        body: JSON.stringify({
          recipients: recipients.map(r => r.email),
          subject,
          body,
          reportData,
          includeAttachment,
          sendCopy
        }),
      });

      toast({
        title: "Email Sent",
        description: `Report sent to ${recipients.length} recipient(s) successfully.`,
      });

      onEmailSent?.();
      onOpenChange(false);
      
      // Reset form
      setRecipients([]);
      setUseCustomTemplate(false);
      setCustomSubject('');
      setCustomBody('');
      
    } catch (error) {
      console.error('Failed to send email:', error);
      toast({
        title: "Email Failed",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <span>Email Report</span>
          </DialogTitle>
          <DialogDescription>
            Send the report via email to selected recipients with customizable templates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Information */}
          {reportData && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-2">Report Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Name:</span> {reportData.name}
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Type:</span> {reportData.type}
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Size:</span> {reportData.size}
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Generated:</span> {new Date().toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Recipients Section */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Recipients</Label>
            
            {/* Add New Recipient */}
            <div className="flex gap-2">
              <Input
                placeholder="Enter email address"
                value={newRecipientEmail}
                onChange={(e) => setNewRecipientEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addNewRecipient()}
                className="flex-1"
              />
              <Button onClick={addNewRecipient} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {/* Suggested Recipients */}
            <div>
              <Label className="text-sm text-gray-600 mb-2 block">Suggested Recipients</Label>
              <div className="flex flex-wrap gap-2">
                {suggestedRecipients.map((recipient) => (
                  <Button
                    key={recipient.email}
                    variant="outline"
                    size="sm"
                    onClick={() => addRecipient(recipient)}
                    disabled={recipients.some(r => r.email === recipient.email)}
                    className="text-xs"
                  >
                    <Users className="h-3 w-3 mr-1" />
                    {recipient.name} ({recipient.role})
                  </Button>
                ))}
              </div>
            </div>

            {/* Selected Recipients */}
            {recipients.length > 0 && (
              <div>
                <Label className="text-sm text-gray-600 mb-2 block">Selected Recipients ({recipients.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {recipients.map((recipient) => (
                    <Badge key={recipient.email} variant="secondary" className="flex items-center gap-1">
                      {recipient.name || recipient.email}
                      <button
                        onClick={() => removeRecipient(recipient.email)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Email Template Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Email Template</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="custom-template"
                  checked={useCustomTemplate}
                  onCheckedChange={setUseCustomTemplate}
                />
                <Label htmlFor="custom-template" className="text-sm">Use custom template</Label>
              </div>
            </div>

            {!useCustomTemplate ? (
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select email template" />
                </SelectTrigger>
                <SelectContent>
                  {defaultTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="custom-subject">Subject</Label>
                  <Input
                    id="custom-subject"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    placeholder="Enter email subject"
                  />
                </div>
                <div>
                  <Label htmlFor="custom-body">Message Body</Label>
                  <Textarea
                    id="custom-body"
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    placeholder="Enter email message"
                    rows={6}
                  />
                </div>
              </div>
            )}

            {/* Template Preview */}
            {!useCustomTemplate && (
              <div className="p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-2">Preview</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Subject:</span> {processTemplate(getTemplate().subject)}
                  </div>
                  <div>
                    <span className="font-medium">Body:</span>
                    <div className="mt-1 whitespace-pre-wrap text-gray-700">
                      {processTemplate(getTemplate().body)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Email Options */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Options</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-attachment"
                  checked={includeAttachment}
                  onCheckedChange={setIncludeAttachment}
                />
                <Label htmlFor="include-attachment" className="text-sm">Include report as attachment</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send-copy"
                  checked={sendCopy}
                  onCheckedChange={setSendCopy}
                />
                <Label htmlFor="send-copy" className="text-sm">Send a copy to myself</Label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between pt-6 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={isLoading || recipients.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Email ({recipients.length})
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
