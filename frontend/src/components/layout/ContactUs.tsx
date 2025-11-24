/**
 * Copyright (c) 2025 Group 2
 * All rights reserved.
 * 
 * This project and its source code are the property of Group 2:
 * - Aryan Tapkire
 * - Dilip Irala Narasimhareddy
 * - Sachi Vyas
 * - Supraj Gijre
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Mail, Phone, MapPin, Send, MessageSquare, Clock } from 'lucide-react';
import { toast } from 'sonner';

const ContactUs: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    
    // Simulate API call - replace with actual API endpoint
    setTimeout(() => {
      toast.success('Message sent successfully! We\'ll get back to you soon.');
      setFormData({ name: '', email: '', subject: '', message: '' });
      setSubmitting(false);
    }, 1000);
  };

  const contactInfo = [
    {
      icon: Mail,
      title: 'Email',
      content: 'nirala,smvyas,atapkir,sgijre@ncsu.edu',
      description: 'Send us an email anytime',
    },
    {
      icon: MapPin,
      title: 'Office',
      content: 'NCSU, Raleigh, NC 27606',
      description: 'Visit us in person',
    },
  ];

  const faqs = [
    {
      question: 'How do I track my order?',
      answer: 'Go to Orders page and click on any order to see real-time tracking.',
    },
    {
      question: 'Can I customize my calorie goals?',
      answer: 'Yes! Visit the Calorie Settings page to set your daily targets.',
    },
    {
      question: 'How does the AI recommendation work?',
      answer: 'Our AI analyzes your preferences, dietary restrictions, and calorie goals to suggest the best meals for you.',
    },
    {
      question: 'How do I become a restaurant partner?',
      answer: 'Register as an OWNER and submit your restaurant details for approval.',
    },
  ];

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Contact Us</h1>
        <p className="text-muted-foreground text-lg">
          We're here to help! Get in touch with our team.
        </p>
      </div>

      {/* Contact Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {contactInfo.map((info, index) => {
          const Icon = info.icon;
          return (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{info.title}</CardTitle>
                    <CardDescription className="text-xs">{info.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{info.content}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contact Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Send us a Message
            </CardTitle>
            <CardDescription>
              Fill out the form below and we'll get back to you within 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Your name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your.email@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="How can we help?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Tell us more about your question or concern..."
                  rows={5}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* FAQs */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Business Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monday - Friday</span>
                <span className="font-medium">8:00 AM - 6:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saturday</span>
                <span className="font-medium">9:00 AM - 4:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sunday</span>
                <span className="font-medium">Closed</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>Quick answers to common questions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <div key={index} className="space-y-1">
                    <h4 className="font-medium text-sm">{faq.question}</h4>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                    {index < faqs.length - 1 && <div className="border-b pt-3" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Additional Info */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-lg">Need Immediate Assistance?</h3>
            <p className="text-muted-foreground">
              For urgent matters, please call us directly at <span className="font-medium text-foreground">+1 (919) NC-STATE</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Average response time: 2-4 hours during business hours
            </p>
            <p className="text-sm text-muted-foreground">
              Sachi Vyas
            </p>
            <p className="text-sm text-muted-foreground">
              Dilip Kumar
            </p>
            <p className="text-sm text-muted-foreground">
              Aryan Tapkire
            </p>
            <p className="text-sm text-muted-foreground">
              Supraj Gijre
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactUs;