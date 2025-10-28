from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Transacao
import logging

logger = logging.getLogger('finance')