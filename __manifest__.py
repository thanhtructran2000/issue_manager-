# -*- coding: utf-8 -*-
{
    'name': "Issue manager",
    'summary': "Issue manager model",
    'description': """Information issue manager""",
    'author': "thanhtruc",
    'website': 'https://www.example.com',
    'category': 'Uncategorized',
    'version': '0.1',
    'depends': [
        'base',
        'mail',
    ],
    'data': [
        'security/ir.model.access.csv',
        'views/issues_views.xml',
        'views/project.xml',
        'views/label_views.xml',
        'views/report_issues_views.xml',
        'wizard/update_state.xml',


    ],
    'installable': True,
    'application': True,
}


