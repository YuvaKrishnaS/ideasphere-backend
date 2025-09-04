const { Report, User, Bit, Stack, ChatMessage } = require('../models');
const { Op } = require('sequelize');
const reputationService = require('../services/reputationService');

class ReportController {
  constructor() {
    this.createReport = this.createReport.bind(this);
    this.getReports = this.getReports.bind(this);
    this.updateReportStatus = this.updateReportStatus.bind(this);
    this.getReportById = this.getReportById.bind(this);
    this.getMyReports = this.getMyReports.bind(this);
  }

  // Create a new report
  async createReport(req, res) {
    try {
      const {
        reportedUserId,
        contentType,
        contentId,
        reason,
        description
      } = req.body;

      const reporterId = req.user.id;

      // Check if user is trying to report themselves
      if (reportedUserId && reportedUserId === reporterId) {
        return res.status(400).json({
          success: false,
          message: 'You cannot report yourself'
        });
      }

      // Create report
      const report = await Report.create({
        reporterId,
        reportedUserId,
        contentType,
        contentId,
        reason,
        description,
        priority: ['violence', 'hate_speech', 'harassment'].includes(reason) ? 'high' : 'medium',
        status: 'pending'
      });

      // Fetch report with related data
      const createdReport = await Report.findByPk(report.id, {
        include: [
          {
            model: User,
            as: 'reporter',
            attributes: ['id', 'username', 'firstName', 'lastName']
          },
          {
            model: User,
            as: 'reportedUser',
            attributes: ['id', 'username', 'firstName', 'lastName']
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Report submitted successfully',
        data: { report: createdReport }
      });

    } catch (error) {
      console.error('Create report error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create report'
      });
    }
  }

  // Get reports (admin/moderator only)
  async getReports(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        priority,
        contentType,
        reason
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};

      if (status) whereClause.status = status;
      if (priority) whereClause.priority = priority;
      if (contentType) whereClause.contentType = contentType;
      if (reason) whereClause.reason = reason;

      const { rows: reports, count } = await Report.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: User,
            as: 'reporter',
            attributes: ['id', 'username', 'firstName', 'lastName']
          },
          {
            model: User,
            as: 'reportedUser',
            attributes: ['id', 'username', 'firstName', 'lastName']
          }
        ]
      });

      res.json({
        success: true,
        data: {
          reports,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit)),
            totalItems: count
          }
        }
      });

    } catch (error) {
      console.error('Get reports error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch reports'
      });
    }
  }

  // Get single report by ID
  async getReportById(req, res) {
    try {
      const { reportId } = req.params;

      const report = await Report.findByPk(reportId, {
        include: [
          {
            model: User,
            as: 'reporter',
            attributes: ['id', 'username', 'firstName', 'lastName']
          },
          {
            model: User,
            as: 'reportedUser',
            attributes: ['id', 'username', 'firstName', 'lastName']
          }
        ]
      });

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      res.json({
        success: true,
        data: { report }
      });

    } catch (error) {
      console.error('Get report error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch report'
      });
    }
  }

  // Update report status
  async updateReportStatus(req, res) {
    try {
      const { reportId } = req.params;
      const { status, actionTaken } = req.body;

      const report = await Report.findByPk(reportId);
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      await report.update({
        status,
        actionTaken,
        reviewedById: req.user.id,
        reviewedAt: new Date()
      });

      // If report is resolved, subtract reputation from reported user
      if (status === 'resolved' && report.reportedUserId) {
        await reputationService.subtractPoints(report.reportedUserId, 'REPORT_CONFIRMED');
      }

      res.json({
        success: true,
        message: 'Report status updated successfully',
        data: { report }
      });

    } catch (error) {
      console.error('Update report status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update report status'
      });
    }
  }

  // Get user's own reports
  async getMyReports(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        contentType
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = { reporterId: req.user.id };

      if (status) whereClause.status = status;
      if (contentType) whereClause.contentType = contentType;

      const { rows: reports, count } = await Report.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: User,
            as: 'reportedUser',
            attributes: ['id', 'username', 'firstName', 'lastName']
          }
        ]
      });

      res.json({
        success: true,
        data: {
          reports,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit)),
            totalItems: count
          }
        }
      });

    } catch (error) {
      console.error('Get my reports error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch your reports'
      });
    }
  }
}

module.exports = new ReportController();
